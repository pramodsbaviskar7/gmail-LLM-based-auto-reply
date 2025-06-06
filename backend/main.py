import os
import logging
import asyncio
import json
import re
import time
import hashlib
import hmac
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict, OrderedDict
from threading import Lock
import weakref
import gc

# Core FastAPI and HTTP components
from fastapi import FastAPI, HTTPException, Request, Response, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import aiohttp
from dotenv import load_dotenv
import tiktoken

# Rate limiting without Redis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(funcName)s:%(lineno)d'
)
logger = logging.getLogger(__name__)

# Thread-safe in-memory cache implementation
class ThreadSafeCache:
    def __init__(self, max_size: int = 10000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache = OrderedDict()
        self._timestamps = {}
        self._lock = Lock()
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'sets': 0
        }
    
    def _is_expired(self, key: str) -> bool:
        if key not in self._timestamps:
            return True
        return time.time() - self._timestamps[key] > self.default_ttl
    
    def _evict_expired(self):
        """Remove expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self._timestamps.items()
            if current_time - timestamp > self.default_ttl
        ]
        
        for key in expired_keys:
            self._cache.pop(key, None)
            self._timestamps.pop(key, None)
            self._stats['evictions'] += 1
    
    def _evict_lru(self):
        """Remove least recently used items if cache is full"""
        while len(self._cache) >= self.max_size:
            oldest_key = next(iter(self._cache))
            self._cache.pop(oldest_key)
            self._timestamps.pop(oldest_key, None)
            self._stats['evictions'] += 1
    
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key in self._cache and not self._is_expired(key):
                # Move to end (mark as recently used)
                value = self._cache.pop(key)
                self._cache[key] = value
                self._stats['hits'] += 1
                return value
            else:
                # Remove expired key
                if key in self._cache:
                    self._cache.pop(key, None)
                    self._timestamps.pop(key, None)
                self._stats['misses'] += 1
                return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        with self._lock:
            # Clean expired entries periodically
            if len(self._cache) % 100 == 0:  # Every 100 operations
                self._evict_expired()
            
            # Evict LRU if needed
            self._evict_lru()
            
            self._cache[key] = value
            self._timestamps[key] = time.time()
            self._stats['sets'] += 1
            return True
    
    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                self._cache.pop(key)
                self._timestamps.pop(key, None)
                return True
            return False
    
    def clear(self):
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()
    
    def size(self) -> int:
        with self._lock:
            return len(self._cache)
    
    def stats(self) -> Dict[str, Any]:
        with self._lock:
            hit_rate = self._stats['hits'] / max(1, self._stats['hits'] + self._stats['misses'])
            return {
                **self._stats,
                'size': len(self._cache),
                'hit_rate': round(hit_rate, 3),
                'max_size': self.max_size
            }

# In-memory rate limiter
class InMemoryRateLimiter:
    def __init__(self):
        self._requests = defaultdict(list)
        self._lock = Lock()
        self._cleanup_counter = 0
    
    def is_allowed(self, identifier: str, limit: int, window: int = 60) -> Tuple[bool, int]:
        current_time = time.time()
        
        with self._lock:
            # Cleanup old entries periodically
            self._cleanup_counter += 1
            if self._cleanup_counter % 100 == 0:
                self._cleanup_old_entries(current_time, window)
            
            # Get requests for this identifier
            requests = self._requests[identifier]
            
            # Remove old requests outside the window
            cutoff_time = current_time - window
            requests[:] = [req_time for req_time in requests if req_time > cutoff_time]
            
            # Check if under limit
            if len(requests) < limit:
                requests.append(current_time)
                return True, len(requests)
            else:
                return False, len(requests)
    
    def _cleanup_old_entries(self, current_time: float, window: int):
        """Remove old entries to prevent memory growth"""
        cutoff_time = current_time - (window * 2)  # Keep some buffer
        
        for identifier in list(self._requests.keys()):
            requests = self._requests[identifier]
            requests[:] = [req_time for req_time in requests if req_time > cutoff_time]
            
            # Remove empty entries
            if not requests:
                del self._requests[identifier]
    
    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                'tracked_clients': len(self._requests),
                'total_requests': sum(len(reqs) for reqs in self._requests.values())
            }

# Enhanced circuit breaker with metrics
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60, success_threshold: int = 3):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._lock = Lock()
        self._stats = {
            'total_requests': 0,
            'failed_requests': 0,
            'state_changes': 0
        }

    def can_execute(self) -> bool:
        with self._lock:
            self._stats['total_requests'] += 1
            
            if self.state == "CLOSED":
                return True
            
            if self.state == "OPEN":
                if self.last_failure_time and time.time() - self.last_failure_time > self.timeout:
                    self.state = "HALF_OPEN"
                    self.success_count = 0
                    self._stats['state_changes'] += 1
                    logger.info("Circuit breaker moved to HALF_OPEN state")
                    return True
                return False
            
            # HALF_OPEN state
            return True

    def record_success(self):
        with self._lock:
            if self.state == "HALF_OPEN":
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    self.state = "CLOSED"
                    self.failure_count = 0
                    self._stats['state_changes'] += 1
                    logger.info("Circuit breaker moved to CLOSED state")
            elif self.state == "CLOSED":
                self.failure_count = max(0, self.failure_count - 1)

    def record_failure(self):
        with self._lock:
            self._stats['failed_requests'] += 1
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.state in ["CLOSED", "HALF_OPEN"] and self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                self._stats['state_changes'] += 1
                logger.warning("Circuit breaker moved to OPEN state")

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                'state': self.state,
                'failure_count': self.failure_count,
                'success_count': self.success_count,
                **self._stats
            }

# Your original working approach - simplified and cleaned up
current_dir = Path(__file__).parent
logger.info(f"Current directory: {current_dir}")
logger.info(f"Looking for .env file at: {current_dir / '.env'}")

# Load environment variables with explicit path (your working method)
env_path = current_dir / '.env'
if env_path.exists():
    logger.info(f".env file found at {env_path}")
    load_dotenv(env_path)
else:
    logger.info(f".env file NOT found at {env_path}")
    # Try loading from current working directory
    logger.info(f"Trying to load from current working directory: {os.getcwd()}")
    load_dotenv()

# Debug: Print environment variables (your working debug method)
logger.info("Environment variables loaded:")
for key, value in os.environ.items():
    if key.startswith("GROQ") or "API" in key:
        logger.info(f"{key}: {value[:10]}..." if value else f"{key}: None")

# Get the API key (your working method)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Your original validation with better error messages
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables!")
    logger.error("Make sure your .env file contains: GROQ_API_KEY=your_actual_key")
    
    # Check if there's a similar key with different casing
    for key in os.environ.keys():
        if "GROQ" in key.upper() or "API" in key.upper():
            logger.info(f"Found similar key: {key}")
    
    raise ValueError("GROQ_API_KEY is required. Check the logs above for details.")
else:
    logger.info(f"GROQ_API_KEY loaded successfully (key starts with: {GROQ_API_KEY[:10]}...)")

# Create a simple config dictionary (instead of a function)
config = {
    "GROQ_API_KEY": GROQ_API_KEY,
    "API_SECRET_KEY": os.getenv("API_SECRET_KEY", "default-secret"),
    "RATE_LIMIT_PER_MINUTE": int(os.getenv("RATE_LIMIT_PER_MINUTE", "100")),
    "MAX_CONCURRENT_REQUESTS": int(os.getenv("MAX_CONCURRENT_REQUESTS", "50")),
    "CACHE_TTL_SECONDS": int(os.getenv("CACHE_TTL_SECONDS", "300")),
    "CACHE_MAX_SIZE": int(os.getenv("CACHE_MAX_SIZE", "5000")),
    "PORT": int(os.getenv("PORT", "8000")),
    "ENVIRONMENT": os.getenv("ENVIRONMENT", "development")
}

logger.info("✅ Configuration loaded successfully")
try:
    # FORCE RELOAD ENVIRONMENT - DEBUG
    print("🔧 FORCING FRESH .ENV RELOAD...")
    from pathlib import Path
    from dotenv import load_dotenv
    
    # Clear any cached environment variables
    import os
    if 'GROQ_API_KEY' in os.environ:
        print(f"Clearing cached GROQ_API_KEY: {os.environ['GROQ_API_KEY'][:20]}...")
        del os.environ['GROQ_API_KEY']
    
    # Force reload .env file
    env_path = Path(__file__).parent / '.env'
    print(f"Force loading .env from: {env_path}")
    load_dotenv(env_path, override=True)
    
    # Test immediate load
    fresh_key = os.getenv("GROQ_API_KEY")
    print(f"Fresh API key loaded: {fresh_key[:20] if fresh_key else 'NONE'}...")
    print("=" * 50)
    
    GROQ_API_KEY = config["GROQ_API_KEY"]
    API_SECRET_KEY = config["API_SECRET_KEY"]
    
    print(f"Final GROQ_API_KEY in use: {GROQ_API_KEY[:20] if GROQ_API_KEY else 'NONE'}...")
    logger.info("Configuration loaded successfully")
except Exception as e:
    logger.error(f"Configuration loading failed: {e}")
    raise

# Initialize global components
response_cache = ThreadSafeCache(
    max_size=config["CACHE_MAX_SIZE"], 
    default_ttl=config["CACHE_TTL_SECONDS"]
)
rate_limiter = InMemoryRateLimiter()
groq_circuit_breaker = CircuitBreaker()
concurrent_requests = asyncio.Semaphore(config["MAX_CONCURRENT_REQUESTS"])

# Token counting with cache
token_cache = ThreadSafeCache(max_size=1000, default_ttl=3600)  # 1 hour TTL

def count_tokens_cached(text: str, model: str = "llama3-8b-8192") -> int:
    cache_key = hashlib.md5(f"{text}:{model}".encode()).hexdigest()
    
    cached_count = token_cache.get(cache_key)
    if cached_count is not None:
        return cached_count
    
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")
    
    count = len(enc.encode(text))
    token_cache.set(cache_key, count)
    return count

# Default configurations
USER_INFO = {
    "full_name": "Your Name",
    "email": "your.email@company.com",
    "linkedin": "https://www.linkedin.com/in/yourprofile",
    "mobile": "+1 (555) 123-4567"
}

EMAIL_CONFIG = {
    "include_signature": True,
    "signature_format": "formal",
    "default_greeting": "Hi",
    "default_closing": "Regards"
}

MODEL_CONFIG = {
    "model": "llama-3.3-70b-versatile",
    "temperature": 0.7,
    "max_tokens": 500
}

# Try to import custom config
try:
    from config import USER_INFO as CUSTOM_USER_INFO, EMAIL_CONFIG as CUSTOM_EMAIL_CONFIG, MODEL_CONFIG as CUSTOM_MODEL_CONFIG
    USER_INFO.update(CUSTOM_USER_INFO)
    EMAIL_CONFIG.update(CUSTOM_EMAIL_CONFIG)
    MODEL_CONFIG.update(CUSTOM_MODEL_CONFIG)
    logger.info("Custom configuration loaded")
except ImportError:
    logger.info("Using default configuration")

class PromptRequest(BaseModel):
    prompt: str = Field(...)
    useCustomPrompt: bool = False
    customPrompt: Optional[str] = Field(None, max_length=5000)
    receiverEmail: Optional[str] = None
    userPreferences: Optional[Dict[str, Any]] = None  # ADD THIS LINE
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()

class ThreadAnalysisRequest(BaseModel):
    thread: Dict[str, Any]
    autoTruncate: bool = True
    
    @validator('thread')
    def validate_thread(cls, v):
        if not v.get('completeThreadText', '').strip():
            raise ValueError('Thread text cannot be empty')
        return v

# Security utilities
def sanitize_input(text: str) -> str:
    if not isinstance(text, str):
        return str(text)
    
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'data:text/html',
        r'vbscript:',
        r'on\w+\s*=',  # onclick, onload, etc.
    ]
    
    sanitized = text
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    
    return sanitized.strip()

def get_cache_key(request_data: dict) -> str:
    cache_data = {
        'prompt': request_data.get('prompt', ''),
        'customPrompt': request_data.get('customPrompt'),
        'useCustomPrompt': request_data.get('useCustomPrompt', False),
        'receiverEmail': request_data.get('receiverEmail', '')
    }
    return hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()

# Custom exception classes
class GroqAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Groq API error: {status_code} - {message}")

# Initialize FastAPI app
app = FastAPI(
    title="RespondX API",
    description="High-performance Gmail Auto Reply API",
    version="2.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "development" else None
)

# Custom rate limiter using our in-memory implementation
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
# CORS configuration for RespondX Chrome Extension
ALLOWED_ORIGINS = [
    # ===== YOUR PRODUCTION API ENDPOINTS =====
    "https://gmail-llm-based-auto-reply.vercel.app",
    "https://gmail-llm-based-auto-reply.onrender.com",
    
    # ===== GMAIL INTEGRATION (REQUIRED) =====
    "https://mail.google.com",
    "https://gmail.com",
    
    # ===== CHROME EXTENSION =====
    "chrome-extension://*",  # Allows your extension to make requests
    
    # ===== DEVELOPMENT ENVIRONMENTS =====
    "http://localhost:3000",   # React development
    "http://localhost:8000",   # FastAPI development
    "http://localhost:8080",   # Alternative dev ports
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    
    # ===== ADDITIONAL BROWSER EXTENSIONS =====
    "moz-extension://*",       # Firefox support (future)
    "safari-web-extension://*", # Safari support (future)
    
    # ===== DEPLOYMENT PLATFORMS =====
    # Vercel (all your deployments)
    "https://*.vercel.app",
    "https://*.vercel.dev",
    # Render (all your deployments)  
    "https://*.onrender.com",
    
    # ===== FUTURE DOMAINS =====
    # Add your custom domain when you get one
    # "https://respondx.com", 
    # "https://www.respondx.com",
    # "https://api.respondx.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if os.getenv("ENVIRONMENT") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security and logging middleware
@app.middleware("http")
async def security_and_logging_middleware(request: Request, call_next):
    start_time = time.time()
    client_ip = get_remote_address(request)
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path} from {client_ip}")
    
    # Basic rate limiting check
    if request.url.path in ["/generate", "/analyze-thread"]:
        allowed, current_requests = rate_limiter.is_allowed(
            client_ip, 
            config["RATE_LIMIT_PER_MINUTE"], 
            60
        )
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_ip}: {current_requests} requests")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded: {current_requests} requests in the last minute",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
    
    # Process request
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Log response
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} in {process_time:.2f}s")
    
    return response

# Background task for cache cleanup
async def cleanup_caches():
    """Periodic cleanup of caches and rate limiter"""
    while True:
        try:
            # Trigger garbage collection
            gc.collect()
            
            # Log cache stats
            cache_stats = response_cache.stats()
            rate_stats = rate_limiter.get_stats()
            circuit_stats = groq_circuit_breaker.get_stats()
            
            logger.info(f"Cache stats: {cache_stats}")
            logger.info(f"Rate limiter stats: {rate_stats}")
            logger.info(f"Circuit breaker stats: {circuit_stats}")
            
            await asyncio.sleep(300)  # Run every 5 minutes
            
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
            await asyncio.sleep(60)  # Retry in 1 minute

# Optimized Groq API request handler
async def make_groq_request(payload: dict, max_retries: int = 3) -> dict:
    if not groq_circuit_breaker.can_execute():
        raise HTTPException(
            status_code=503, 
            detail="Service temporarily unavailable due to high error rate"
        )
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "RespondX-API/2.0"  # Move User-Agent here
    }
    
    async with concurrent_requests:
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=20,
            ttl_dns_cache=300,
            use_dns_cache=True,
        )
        
        timeout = aiohttp.ClientTimeout(total=30)
        
        # Remove session-level headers
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        ) as session:
            
            for attempt in range(max_retries):
                try:
                    async with session.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json=payload,
                        headers=headers,  # All headers together
                        timeout=aiohttp.ClientTimeout(total=30 + (attempt * 10))
                    ) as response:
                        response_text = await response.text()
                        
                        if response.status == 200:
                            groq_circuit_breaker.record_success()
                            return json.loads(response_text)
                        
                        if response.status == 429:  # Rate limited
                            wait_time = min(2 ** attempt + (attempt * 0.1), 30)
                            logger.warning(f"Rate limited by Groq, waiting {wait_time}s")
                            await asyncio.sleep(wait_time)
                            continue
                        
                        # Parse error
                        try:
                            error_data = json.loads(response_text)
                            error_message = error_data.get("error", {}).get("message", "Unknown error")
                        except json.JSONDecodeError:
                            error_message = response_text[:200]
                        
                        if attempt == max_retries - 1:
                            groq_circuit_breaker.record_failure()
                            raise GroqAPIError(response.status, error_message)
                        
                        if response.status >= 500:
                            await asyncio.sleep(min(2 ** attempt, 10))
                            
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    logger.error(f"Network error on attempt {attempt + 1}: {e}")
                    if attempt == max_retries - 1:
                        groq_circuit_breaker.record_failure()
                        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
                    await asyncio.sleep(min(2 ** attempt, 10))
    
    raise HTTPException(status_code=503, detail="Service unavailable after all retries")

# Add these imports to your existing main.py file (after your existing imports)
from enum import Enum
from typing import List, Optional

# Add these Pydantic models after your existing models (after ThreadAnalysisRequest)

class ToneEnum(str, Enum):
    professional = "professional"
    friendly = "friendly"
    formal = "formal"
    casual = "casual"
    concise = "concise"
    enthusiastic = "enthusiastic"
    neutral = "neutral"

class LengthEnum(str, Enum):
    brief = "brief"          # 2-3 sentences
    short = "short"          # 1 paragraph
    medium = "medium"        # 2-3 paragraphs
    detailed = "detailed"    # 4+ paragraphs

class LanguageEnum(str, Enum):
    english = "english"
    spanish = "spanish"
    french = "french"
    german = "german"
    italian = "italian"
    portuguese = "portuguese"
    chinese = "chinese"
    japanese = "japanese"
    hindi = "hindi"

class ResponseTypeEnum(str, Enum):
    general = "general"
    accept = "accept"
    decline = "decline"
    request = "request"
    reschedule = "reschedule"
    followup = "followup"
    thank = "thank"
    apology = "apology"

class GreetingStyleEnum(str, Enum):
    default = "default"
    firstname = "firstname"
    formal = "formal"
    team = "team"
    time = "time"

class VoiceEnum(str, Enum):
    first = "first"    # I/We
    second = "second"  # You
    third = "third"    # Third person

class ComplexityEnum(str, Enum):
    simple = "simple"
    standard = "standard"
    technical = "technical"
    business = "business"

class StructureEnum(str, Enum):
    standard = "standard"
    bullets = "bullets"
    numbered = "numbered"
    sections = "sections"

# 🔥 NEW: UserPreferences model to handle signature data
class UserPreferences(BaseModel):
    hasPreferences: bool = Field(default=False, description="Whether user has saved preferences")
    email: Optional[str] = Field(None, description="User email")
    full_name: Optional[str] = Field(None, description="User full name")
    linkedin: Optional[str] = Field(None, description="User LinkedIn profile")
    mobile: Optional[str] = Field(None, description="User mobile number")

class ComposeRequest(BaseModel):
    # Basic options - Required
    prompt: str = Field(..., min_length=1, max_length=1000, description="What you want to write about")
    
    # Basic options - Optional with defaults
    tone: ToneEnum = Field(default=ToneEnum.professional, description="Email tone")
    length: LengthEnum = Field(default=LengthEnum.medium, description="Email length")
    language: LanguageEnum = Field(default=LanguageEnum.english, description="Email language")
    responseType: ResponseTypeEnum = Field(default=ResponseTypeEnum.general, description="Type of response")
    recipientContext: Optional[str] = Field(None, max_length=200, description="Who you're writing to")
    
    # Checkboxes
    includeGreeting: bool = Field(default=True, description="Include greeting")
    includeClosing: bool = Field(default=True, description="Include closing")
    includeSignature: bool = Field(default=True, description="Include signature")
    useEmojis: bool = Field(default=False, description="Use emojis")
    
    # Advanced options
    greetingStyle: GreetingStyleEnum = Field(default=GreetingStyleEnum.default, description="Greeting style")
    voice: VoiceEnum = Field(default=VoiceEnum.first, description="Voice perspective")
    complexity: ComplexityEnum = Field(default=ComplexityEnum.standard, description="Language complexity")
    structure: StructureEnum = Field(default=StructureEnum.standard, description="Content structure")
    
    # Optional custom fields
    subjectLine: Optional[str] = Field(None, max_length=200, description="Custom subject line")
    openingSentence: Optional[str] = Field(None, max_length=300, description="Custom opening")
    closingLine: Optional[str] = Field(None, max_length=300, description="Custom closing")
    
    # Advanced checkboxes
    includeThreadSummary: bool = Field(default=False, description="Include thread summary")
    referencePastMessages: bool = Field(default=False, description="Reference past messages")
    autoInsert: bool = Field(default=False, description="Auto-insert into Gmail")
    
    # 🔥 NEW: User preferences from frontend
    userPreferences: Optional[UserPreferences] = Field(None, description="User signature preferences")
    
    # Form tracking (these are optional and won't break if missing)
    formStateId: Optional[float] = Field(None, description="Form state ID")
    timestamp: Optional[int] = Field(None, description="Timestamp")
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()

class ComposeResponse(BaseModel):
    subject: str = Field(..., description="Generated email subject")
    body: str = Field(..., description="Generated email body")
    cached: bool = Field(..., description="Whether response was cached")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

def build_compose_prompt(compose_request: ComposeRequest, user_info: dict) -> str:
    """
    Build a comprehensive system prompt for email composition with proper formatting
    Now includes dynamic signature handling based on user preferences
    """
    
    # Check if we have real user preferences
    has_user_preferences = (
        compose_request.userPreferences and 
        compose_request.userPreferences.hasPreferences
    )
    
    # MANDATORY FORMATTING INSTRUCTIONS - Always at the top
    formatting_instructions = """
MANDATORY FORMATTING REQUIREMENTS:
- ALWAYS start your response with "Subject: [your subject line]" 
- Use proper line breaks (\\n) between sections
- Never write emails as a single paragraph or single line
- Always separate greeting, body, closing, and signature with line breaks
- Each paragraph should be on its own line
- Add blank lines between major sections

EXACT FORMAT STRUCTURE REQUIRED:
Subject: [Compelling and specific subject line based on email content]

[Greeting],

[Body paragraph 1]

[Body paragraph 2 if needed]

[Closing],
[Signature]

FORMATTING EXAMPLES:

SHORT EMAIL EXAMPLE:
Subject: Quick Reminder: Friday Deadline

Hello,

I wanted to remind you about our product launch deadline next Friday. Please send your status update by end of week.

Best regards,
Your Name

MEDIUM EMAIL EXAMPLE:
Subject: Reminder: Product Launch Deadline and Status Updates

Hello,

I hope this email finds you well.

I wanted to remind you about our upcoming product launch deadline, which is set for next Friday. As we approach this important milestone, I would appreciate if each team member could provide a quick status update on their assigned tasks.

Please send your updates by the end of this week so we can ensure everything stays on track.

Best regards,
Your Name
"""
    
    # Length-specific guidelines
    length_guidelines = {
        "brief": """
LENGTH: BRIEF (50-100 words total)
- Use exactly 1-2 body paragraphs
- Maximum 2 sentences per paragraph
- Keep it concise but properly formatted with line breaks
- Structure: Subject → Greeting → Body (1-2 paragraphs) → Closing → Signature
""",
        "short": """
LENGTH: SHORT (75-150 words total)
- Use exactly 1-2 body paragraphs
- Maximum 2-3 sentences per paragraph
- Keep it concise but properly formatted with line breaks
- Structure: Subject → Greeting → Body (1-2 paragraphs) → Closing → Signature
""",
        "medium": """
LENGTH: MEDIUM (150-250 words total)
- Use exactly 2-3 body paragraphs
- 2-3 sentences per paragraph
- Balanced detail with proper paragraph separation
- Structure: Subject → Greeting → Body (2-3 paragraphs) → Closing → Signature
""",
        "detailed": """
LENGTH: DETAILED (250+ words total)
- Use exactly 3-4 body paragraphs
- 3-4 sentences per paragraph
- Comprehensive content with clear paragraph structure
- Structure: Subject → Greeting → Body (3-4 paragraphs) → Closing → Signature
"""
    }
    
    # Tone guidelines
    tone_guidelines = {
        "professional": "Use formal business language, polite and respectful tone",
        "friendly": "Use warm, approachable language while maintaining professionalism",
        "casual": "Use relaxed, conversational tone but still appropriate for email",
        "formal": "Use very formal, traditional business language and structure",
        "concise": "Use brief, direct language while remaining professional",
        "enthusiastic": "Use energetic, positive language while maintaining professionalism",
        "neutral": "Use balanced, objective language without strong emotional tone"
    }
    
    # Get specific guidelines
    length_instruction = length_guidelines.get(compose_request.length, length_guidelines["medium"])
    tone_instruction = tone_guidelines.get(compose_request.tone, "professional")
    
    # Build sections based on user preferences
    greeting_instruction = "Include appropriate greeting" if compose_request.includeGreeting else "Skip greeting and start with main content"
    closing_instruction = "Include appropriate closing" if compose_request.includeClosing else "Skip closing"
    
    # 🔥 NEW: Dynamic signature instruction based on preferences
    if compose_request.includeSignature:
        if has_user_preferences:
            # Use real user data
            user_prefs = compose_request.userPreferences
            signature_parts = []
            
            if user_prefs.full_name:
                signature_parts.append(f"{user_prefs.full_name}")
            if user_prefs.email:
                signature_parts.append(f"{user_prefs.email}")
            if user_prefs.linkedin:
                signature_parts.append(f"{user_prefs.linkedin}")
            if user_prefs.mobile:
                signature_parts.append(f"{user_prefs.mobile}")
            
            if signature_parts:
                signature_instruction = f"Include signature with the following EXACT information (each on a new line):\n{chr(10).join(signature_parts)}"
            else:
                signature_instruction = f"Include signature with: {user_info['full_name']}, {user_info['email']}, {user_info['linkedin']}, {user_info['mobile']}"
        else:
            # Use template data
            signature_instruction = f"Include signature with: {user_info['full_name']}, {user_info['email']}, {user_info['linkedin']}, {user_info['mobile']}"
    else:
        signature_instruction = "Skip signature"
    
    emoji_instruction = "Include appropriate emojis throughout the email" if compose_request.useEmojis else "Do not use any emojis"
    
    # Build the complete system prompt
    system_prompt = f"""
You are a professional email composer. Your task is to write well-formatted emails that follow proper structure and formatting.

{formatting_instructions}

EMAIL REQUIREMENTS:
{length_instruction}

TONE & STYLE:
- Tone: {compose_request.tone} - {tone_instruction}
- Language: {compose_request.language}
- IMPORTANT: Always write the email in English, even if the user input contains Hinglish or mixed languages, unless the user specifically requests to write in Hindi
- Voice: {compose_request.voice} person
- Complexity: {compose_request.complexity}

CONTENT REQUIREMENTS:
- {greeting_instruction}
- {closing_instruction}
- {signature_instruction}
- {emoji_instruction}

CUSTOM ELEMENTS:
- Subject Line: {compose_request.subjectLine if compose_request.subjectLine else "Generate appropriate subject"}
- Opening: {compose_request.openingSentence if compose_request.openingSentence else "Use natural opening"}
- Closing: {compose_request.closingLine if compose_request.closingLine else "Use appropriate closing"}

SIGNATURE INFORMATION:
{'- Using REAL user preferences from saved settings' if has_user_preferences else '- Using template signature information'}

CRITICAL REMINDERS:
1. ALWAYS start with "Subject: [your subject line]" on the first line
2. NEVER write the email as a single paragraph or single line
3. ALWAYS use line breaks between paragraphs
4. ALWAYS separate greeting, body, closing, and signature
5. Follow the exact format structure shown in examples above
6. Each paragraph must be on its own line with blank lines between sections
{'7. Use the EXACT signature information provided above' if has_user_preferences else '7. Use appropriate signature format'}

Write a properly formatted email that follows all these requirements.
"""
    
    return system_prompt

# Helper function to generate subject line
def generate_subject_line(prompt: str, response_type: str, custom_subject: Optional[str] = None) -> str:
    """Generate an appropriate subject line"""
    
    if custom_subject:
        return custom_subject.strip()
    
    # Simple subject line generation based on prompt and type
    subject_templates = {
        "accept": "Re: Acceptance Confirmation",
        "decline": "Re: Unable to Proceed",
        "request": "Request for Information",
        "reschedule": "Rescheduling Request", 
        "followup": "Follow-up",
        "thank": "Thank You",
        "apology": "Apology",
        "general": "Response"
    }
    
    # Try to extract key terms from prompt for better subjects
    prompt_lower = prompt.lower()
    if "meeting" in prompt_lower:
        return f"Re: Meeting {subject_templates.get(response_type, 'Discussion')}"
    elif "project" in prompt_lower:
        return f"Re: Project {subject_templates.get(response_type, 'Update')}"
    elif "proposal" in prompt_lower:
        return f"Re: Proposal {subject_templates.get(response_type, 'Response')}"
    elif "interview" in prompt_lower:
        return f"Re: Interview {subject_templates.get(response_type, 'Follow-up')}"
    
    return subject_templates.get(response_type, "Response")

# Add this endpoint to your FastAPI app (add after your existing endpoints)

import re

def extract_subject_from_email(email_content: str) -> tuple[str, str]:
    """
    Extract subject line from AI-generated email content and return clean body.
    
    Args:
        email_content: The full email content from AI
        
    Returns:
        tuple: (extracted_subject, clean_body)
    """
    
    # Pattern to match "Subject: ..." at the beginning
    subject_pattern = r'^Subject:\s*(.+?)(?:\n|$)'
    
    # Try to find subject in the email content
    subject_match = re.search(subject_pattern, email_content.strip(), re.IGNORECASE | re.MULTILINE)
    
    if subject_match:
        # Extract the subject
        extracted_subject = subject_match.group(1).strip()
        
        # Remove the subject line from the body
        clean_body = re.sub(subject_pattern, '', email_content.strip(), flags=re.IGNORECASE | re.MULTILINE).strip()
        
        print(f"📧 Extracted subject from AI: '{extracted_subject}'")
        return extracted_subject, clean_body
    
    # If no subject found in content, return None and original body
    print("📧 No subject found in AI content")
    return None, email_content.strip()

@app.post("/api/compose", response_model=ComposeResponse)
@limiter.limit("50/minute")  # Adjust rate limit as needed
async def compose_email(
    request: Request, 
    compose_request: ComposeRequest, 
    background_tasks: BackgroundTasks
):
    """
    Generate a complete email based on user requirements.
    Now supports user preferences from auto-reply system for signatures.
    """
    try:
        # Sanitize input
        prompt_text = sanitize_input(compose_request.prompt)
        
        # DEBUG: Log the parameters we're receiving
        print(f"🎯 useEmojis: {compose_request.useEmojis}")
        print(f"🎯 tone: {compose_request.tone}")
        print(f"🎯 includeGreeting: {compose_request.includeGreeting}")
        print(f"🎯 includeClosing: {compose_request.includeClosing}")
        print(f"🎯 includeSignature: {compose_request.includeSignature}")
        print(f"🎯 userPreferences: {compose_request.userPreferences}")
        
        # 🔥 NEW: Determine user info based on preferences
        if compose_request.userPreferences and compose_request.userPreferences.hasPreferences:
            # Use the actual user preferences from auto-reply system
            selected_user_info = {
                "full_name": compose_request.userPreferences.full_name or "Your Name",
                "email": compose_request.userPreferences.email or "your.email@company.com",
                "linkedin": compose_request.userPreferences.linkedin or "https://www.linkedin.com/in/yourprofile",
                "mobile": compose_request.userPreferences.mobile or "+1 (555) 123-4567"
            }
            print(f"✅ Using saved user preferences: {selected_user_info}")
        else:
            # Fallback logic (same as before)
            user_identity = compose_request.recipientContext or ""
            if "pramodsbaviskar7@gmail.com" in user_identity or "pramod baviskar" in user_identity:
                selected_user_info = USER_INFO
            else:
                selected_user_info = {
                    "full_name": "Your Name",
                    "email": "your.email@company.com",
                    "linkedin": "https://www.linkedin.com/in/yourprofile",
                    "mobile": "+1 (555) 123-4567"
                }
            print(f"📝 Using fallback user info: {selected_user_info}")
        
        # Build the system prompt with the determined user info
        system_prompt = build_compose_prompt(compose_request, selected_user_info)
        
        # DEBUG: Log the system prompt to see if parameters are being used
        print(f"📝 System prompt snippet: {system_prompt[:200]}...")
        
        # Create user message
        user_message = f"Write an email about: {prompt_text}"
        if compose_request.recipientContext:
            user_message += f"\nRecipient: {compose_request.recipientContext}"
        
        # Prepare API request
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        payload = {
            "messages": messages,
            "model": MODEL_CONFIG['model'],
            "temperature": MODEL_CONFIG['temperature'], 
            "max_tokens": MODEL_CONFIG['max_tokens']
        }
        
        # Make API request
        result = await make_groq_request(payload)
        
        if "choices" not in result or len(result["choices"]) == 0:
            raise HTTPException(status_code=500, detail="Invalid API response")
        
        # 🔥 GET RAW AI RESPONSE
        raw_email_content = result["choices"][0]["message"]["content"].strip()
        print(f"🤖 Raw AI response: {raw_email_content[:200]}...")
        
        # 🔥 EXTRACT SUBJECT FROM AI RESPONSE
        extracted_subject, clean_email_body = extract_subject_from_email(raw_email_content)
        
        # 🔥 USE EXTRACTED SUBJECT OR FALLBACK
        if extracted_subject:
            final_subject = extracted_subject
            print(f"✅ Using AI-extracted subject: '{final_subject}'")
        else:
            # Fallback to old method if extraction fails
            final_subject = generate_subject_line(
                prompt_text, 
                compose_request.responseType,
                compose_request.subjectLine
            )
            clean_email_body = raw_email_content  # Use original content if no subject extracted
            print(f"🔄 Using fallback subject: '{final_subject}'")
        
        print("final_subject:", final_subject)
        print("final_email_body length:", len(clean_email_body))
        
        # Prepare response
        response_data = {
            "subject": final_subject,  # 🔥 NOW USES AI-EXTRACTED SUBJECT
            "body": clean_email_body,  # 🔥 CLEAN BODY WITH PROPER SIGNATURE
            "cached": False,  # Always false now since no caching
            "metadata": {
                "tone": compose_request.tone,
                "length": compose_request.length,
                "language": compose_request.language,
                "subjectSource": "ai_extracted" if extracted_subject else "fallback",
                "signatureSource": "user_preferences" if (compose_request.userPreferences and compose_request.userPreferences.hasPreferences) else "template",
                "word_count": len(clean_email_body.split()),
                "character_count": len(clean_email_body),
                "hasUserPreferences": bool(compose_request.userPreferences and compose_request.userPreferences.hasPreferences)
            }
        }
        
        logger.info(f"Generated email successfully - Subject: {final_subject}, Body length: {len(clean_email_body)}")
        print(f"✅ Generated email with signature preferences")
        
        return ComposeResponse(**response_data)
        
    except GroqAPIError as e:
        logger.error(f"Groq API error in compose: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in compose: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/compose/templates")
async def get_email_templates():
    """Get available email templates"""
    templates = {
        "meeting-request": {
            "name": "Meeting Request",
            "description": "Request a meeting with someone",
            "prompt": "Write an email requesting a meeting to discuss the upcoming project timeline and deliverables. Suggest a few time slots for next week.",
            "suggested_tone": "professional",
            "suggested_length": "medium"
        },
        "follow-up": {
            "name": "Follow-up Email", 
            "description": "Follow up on a previous conversation",
            "prompt": "Write a follow-up email checking on the status of our previous discussion and offering additional assistance if needed.",
            "suggested_tone": "friendly",
            "suggested_length": "short"
        },
        "thank-you": {
            "name": "Thank You",
            "description": "Express gratitude",
            "prompt": "Write a thank you email expressing appreciation for their time and assistance with the recent project.",
            "suggested_tone": "friendly",
            "suggested_length": "brief"
        },
        "introduction": {
            "name": "Introduction Email",
            "description": "Introduce yourself or make a connection",
            "prompt": "Write a professional introduction email introducing myself and explaining how I can help with their business needs.",
            "suggested_tone": "professional", 
            "suggested_length": "medium"
        }
    }
    
    return {"templates": templates}

@app.post("/generate")
async def generate_reply(request: Request, prompt_request: PromptRequest, background_tasks: BackgroundTasks):
    try:
        # Sanitize inputs
        prompt_text = sanitize_input(prompt_request.prompt)
        custom_prompt = sanitize_input(prompt_request.customPrompt) if prompt_request.customPrompt else None
        # Now you can access userPreferences
        if prompt_request.userPreferences:
            user_prefs = prompt_request.userPreferences
            print(f"User preferences: {user_prefs}")
            print(f"User email: {user_prefs.email if hasattr(user_prefs, 'email') else user_prefs.get('email')}")
            print(f"User name: {user_prefs.full_name if hasattr(user_prefs, 'full_name') else user_prefs.get('full_name')}")
        else:
            print("No user preferences provided")
        cache_key = get_cache_key(prompt_request.dict())
        cached_response = response_cache.get(cache_key)
        
        if cached_response:
            logger.info("Cache hit for request")
            return {"reply": cached_response, "cached": True}
        
        # Determine user configuration - Use userPreferences if available
        if prompt_request.userPreferences and prompt_request.userPreferences.get('hasPreferences'):
            # Use userPreferences from the request
            user_prefs = prompt_request.userPreferences
            selected_user_info = {
                "full_name": user_prefs.get('full_name') or "Your Name",
                "email": user_prefs.get('email') or "your.email@company.com", 
                "linkedin": user_prefs.get('linkedin') or "https://www.linkedin.com/in/yourprofile",
                "mobile": user_prefs.get('mobile') or "+1 (555) 123-4567"
            }
        else:
            # Fallback to existing logic
            user_identity = prompt_request.receiverEmail or ""
            logger.info(f"mail received:\n{user_identity}")
            if user_identity and ("pramodsbaviskar7@gmail.com" in user_identity or "pramod baviskar" in user_identity):
                selected_user_info = USER_INFO
            else:
                selected_user_info = {
        "full_name": "Your Name",
        "email": "your.email@company.com",
        "linkedin": "https://www.linkedin.com/in/yourprofile",
        "mobile": "+1 (555) 123-4567"
    }
        import textwrap

        signature_template = textwrap.dedent(f"""\
    {EMAIL_CONFIG['default_closing']},
    {selected_user_info['full_name']}
    {selected_user_info['email']}
    {selected_user_info['linkedin']}
    {selected_user_info['mobile']}""")
        logger.info(f"signature_template :\n{signature_template}")

        # Build messages
        if prompt_request.useCustomPrompt and custom_prompt:
            logger.info(f"signature_template inside custom_prompt:\n{signature_template}")
            system_prompt = f"""You are writing an email reply. Follow the user's specific instructions to craft the response. 
Write the email content directly without any meta-text, introductions, or explanations.
Just write the email body as requested.

End your email with this signature:

{signature_template}

Remember: Only output the email content directly. No instructions, no "Here is your reply:", just the email itself."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Original email: {prompt_text}\n\nInstructions: {custom_prompt}"}
            ]
        else:
            # Auto mode: Use default behavior with few-shot examples
            system_prompt = f"""You're a helpful assistant that writes professional Gmail replies. 
Always end your replies with a professional signature in this exact format:

{signature_template}

Important: Use this exact signature information in all replies. The name is {selected_user_info['full_name']}, email is {selected_user_info['email']}, LinkedIn is {selected_user_info['linkedin']}, and mobile is {selected_user_info['mobile']}."""
            few_shot_examples = [
                {
                    "role": "user",
                    "content": "Reply to: Hi, I'd like to schedule a meeting to discuss the project timeline."
                },
                {
                    "role": "assistant",
                    "content": f"""Thank you for reaching out regarding the project timeline discussion. I would be happy to schedule a meeting with you.

I'm available this week on Tuesday and Thursday afternoons, or any time on Friday. Please let me know what time works best for you, and I'll send a calendar invite.

Looking forward to our discussion.

{signature_template}"""
                },
                {
                    "role": "user",
                    "content": "Reply to: Thanks for your proposal. Can you provide more details about the pricing?"
                },
                {
                    "role": "assistant",
                    "content": f"""Thank you for your interest in our proposal. I'm glad to provide more detailed pricing information.

I'll prepare a comprehensive pricing breakdown that includes:
- Individual service costs
- Volume discounts available
- Payment terms and options

I'll have this ready for you by tomorrow afternoon. Would you prefer to receive this via email or would you like to schedule a brief call to go through it together?

{signature_template}"""
                }
            ]

            # Construct the messages with few-shot examples
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(few_shot_examples)
            messages.append({"role": "user", "content": f"Reply to this email:\n\n{prompt_text}"})
        

        # Make API request
        payload = {
            "messages": messages,
            "model": MODEL_CONFIG['model'],
            "temperature": MODEL_CONFIG['temperature'], 
            "max_tokens": MODEL_CONFIG['max_tokens']
        }
        
        result = await make_groq_request(payload)
        
        if "choices" not in result or len(result["choices"]) == 0:
            raise HTTPException(status_code=500, detail="Invalid API response")
        
        reply = result["choices"][0]["message"]["content"].strip()
        
        # Cache the result in background
        background_tasks.add_task(response_cache.set, cache_key, reply)
        
        logger.info(f"Generated reply successfully (length: {len(reply)})")
        return {"reply": reply, "cached": False}
        
    except GroqAPIError as e:
        logger.error(f"Groq API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.post("/analyze-thread")
async def analyze_email_thread(request: Request, thread_request: ThreadAnalysisRequest):
    try:
        email_chain = sanitize_input(thread_request.thread.get("completeThreadText", ""))
        
        if not email_chain:
            raise HTTPException(status_code=400, detail="Email chain cannot be empty")
        
        # Check cache
        cache_key = get_cache_key({"thread": email_chain})
        cached_analysis = response_cache.get(cache_key)
        
        if cached_analysis:
            return {"analysis": cached_analysis, "cached": True}
        
        # Token limit check
        token_count = count_tokens_cached(email_chain)
        max_tokens = MODEL_CONFIG['max_tokens']
        
        if token_count > max_tokens:
            if thread_request.autoTruncate:
                email_chain = email_chain[-max_tokens * 3:]  # Rough truncation
            else:
                raise HTTPException(status_code=413, detail="Input too long")
        
        analysis_prompt = """
You are an AI email analyst. Analyze the following email thread and respond with **only** a strict, valid JSON object.

Your output must:
- Begin directly with '{' and end with '}'.
- Contain **no extra characters** outside the JSON.
- Include **no explanations**, **no headings**, and **no markdown formatting**.
- Exclude notes like "Here is your JSON", "Here's the result:", "```json", or trailing dots (...).

Instructions:
1. Generate a **concise, focused summary** (2-3 sentences maximum) that captures:
   - The main purpose/request of the thread
   - Key decision or outcome (if any)
   - Current status or next steps
   Keep it brief and actionable - focus on WHAT was discussed and WHAT needs to happen next.

2. Perform "sentiment_analysis" of the thread (e.g., positive, negative, neutral), and highlight tone shifts if any.
3. Perform "topic modeling" to extract main topics and subtopics.
4. Extract all "named_entities", including:
   - People
   - Companies
   - Dates (with context)
   - Mobile numbers
   - Email addresses
   - Locations

Return a single valid JSON object with this structure:
{
  "summary": string,
  "sentiment_analysis": {
    "overall": string,
    "tone_shifts": list
  },
  "topics": {
    "main": [
      {
        "label": string,
        "subtopics": list
      }
    ]
  },
  "named_entities": {
    "people": list,
    "companies": list,
    "dates": list,
    "mobile_numbers": list,
    "email_addresses": list,
    "locations": list
  }
}
Do not include any additional content.
"""
        
        payload = {
            "messages": [
                {"role": "system", "content": analysis_prompt},
                {"role": "user", "content": f"Email Thread:\n{email_chain}"}
            ],
            "model": MODEL_CONFIG["model"],
            "temperature": 0.3,
            "max_tokens": max_tokens
        }
        
        result = await make_groq_request(payload)
        analysis_str = result["choices"][0]["message"]["content"].strip()
        
        # Parse JSON
        json_match = re.search(r'\{.*\}', analysis_str, re.DOTALL)
        if not json_match:
            raise HTTPException(status_code=500, detail="No valid JSON in response")
        
        analysis_dict = json.loads(json_match.group(0))
        
        # Cache result
        response_cache.set(cache_key, analysis_dict, ttl=600)  # 10 minute TTL
        
        return {"analysis": analysis_dict, "cached": False}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse analysis")
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.head("/health")
@app.get("/health")
async def health_check():
    """Health check endpoint without external API calls"""
    try:
        cache_stats = response_cache.stats()
        circuit_stats = groq_circuit_breaker.get_stats()
        
        # Simple internal health checks
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "cache": cache_stats,
            "circuit_breaker": circuit_stats,
            "version": "2.0.0",
            "system": {
                "cache_size": response_cache.size(),
                "concurrent_requests_available": concurrent_requests._value,
                "max_concurrent_requests": config["MAX_CONCURRENT_REQUESTS"]
            }
        }
        
        # Check if circuit breaker is open (indicates issues)
        if circuit_stats["state"] == "OPEN":
            health_status["status"] = "degraded"
            health_status["warning"] = "Circuit breaker is open - external API issues detected"
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "version": "2.0.0"
            }
        )
    
@app.get("/metrics")
async def get_metrics():
    return {
        "cache": response_cache.stats(),
        "token_cache": token_cache.stats(),
        "rate_limiter": rate_limiter.get_stats(),
        "circuit_breaker": groq_circuit_breaker.get_stats(),
        "concurrent_requests": {
            "available": concurrent_requests._value,
            "max": config["MAX_CONCURRENT_REQUESTS"]
        }
    }

@app.get("/")
async def root():
    return {
        "service": "RespondX API",
        "version": "2.0.0",
        "status": "running",
        "features": [
            "in-memory caching",
            "rate limiting", 
            "circuit breaker",
            "concurrent request limiting",
            "input sanitization"
        ],
        "endpoints": ["/generate", "/analyze-thread", "/health", "/metrics"]
    }

# Cache management endpoints
@app.post("/admin/cache/clear")
async def clear_cache():
    """Clear all caches (admin endpoint)"""
    response_cache.clear()
    token_cache.clear()
    return {"message": "All caches cleared", "timestamp": datetime.now().isoformat()}

@app.get("/admin/cache/stats")
async def detailed_cache_stats():
    """Get detailed cache statistics"""
    return {
        "response_cache": response_cache.stats(),
        "token_cache": token_cache.stats(),
        "cache_sizes": {
            "response_cache_mb": response_cache.size() * 0.001,  # Rough estimate
            "token_cache_mb": token_cache.size() * 0.0001
        }
    }

# Add these endpoints to your FastAPI app to view cached data

@app.get("/admin/cache/view")
async def view_cache_contents():
    """View all cached responses (admin endpoint)"""
    cache_contents = {}
    
    with response_cache._lock:
        for key, value in response_cache._cache.items():
            # Get timestamp
            timestamp = response_cache._timestamps.get(key, 0)
            cache_contents[key] = {
                "value": value[:200] + "..." if len(str(value)) > 200 else value,  # Truncate long values
                "timestamp": datetime.fromtimestamp(timestamp).isoformat(),
                "size_chars": len(str(value)),
                "expires_in_seconds": max(0, response_cache.default_ttl - (time.time() - timestamp))
            }
    
    return {
        "cache_size": len(cache_contents),
        "cache_contents": cache_contents,
        "cache_stats": response_cache.stats()
    }

@app.get("/admin/cache/search/{search_term}")
async def search_cache(search_term: str):
    """Search cached responses by content"""
    matching_entries = {}
    
    with response_cache._lock:
        for key, value in response_cache._cache.items():
            if search_term.lower() in str(value).lower():
                timestamp = response_cache._timestamps.get(key, 0)
                matching_entries[key] = {
                    "value": str(value),
                    "timestamp": datetime.fromtimestamp(timestamp).isoformat(),
                    "expires_in_seconds": max(0, response_cache.default_ttl - (time.time() - timestamp))
                }
    
    return {
        "search_term": search_term,
        "matches_found": len(matching_entries),
        "matches": matching_entries
    }

@app.get("/admin/cache/key/{cache_key}")
async def get_cache_by_key(cache_key: str):
    """Get specific cached response by key"""
    cached_value = response_cache.get(cache_key)
    
    if cached_value is None:
        raise HTTPException(status_code=404, detail="Cache key not found")
    
    with response_cache._lock:
        timestamp = response_cache._timestamps.get(cache_key, 0)
    
    return {
        "cache_key": cache_key,
        "value": cached_value,
        "timestamp": datetime.fromtimestamp(timestamp).isoformat(),
        "expires_in_seconds": max(0, response_cache.default_ttl - (time.time() - timestamp)),
        "size_chars": len(str(cached_value))
    }

@app.get("/admin/cache/stats/detailed")
async def detailed_cache_stats():
    """Get detailed cache statistics with size breakdown"""
    with response_cache._lock:
        cache_data = {}
        total_size = 0
        
        for key, value in response_cache._cache.items():
            size = len(str(value))
            total_size += size
            timestamp = response_cache._timestamps.get(key, 0)
            
            cache_data[key] = {
                "size_chars": size,
                "timestamp": datetime.fromtimestamp(timestamp).isoformat(),
                "age_seconds": int(time.time() - timestamp),
                "expires_in_seconds": max(0, response_cache.default_ttl - (time.time() - timestamp))
            }
    
    return {
        "cache_stats": response_cache.stats(),
        "total_size_chars": total_size,
        "total_size_kb": round(total_size / 1024, 2),
        "entries": cache_data,
        "oldest_entry": min(cache_data.values(), key=lambda x: x["timestamp"], default=None),
        "newest_entry": max(cache_data.values(), key=lambda x: x["timestamp"], default=None)
    }

# Cache management endpoints
@app.delete("/admin/cache/key/{cache_key}")
async def delete_cache_key(cache_key: str):
    """Delete specific cache entry"""
    success = response_cache.delete(cache_key)
    
    if not success:
        raise HTTPException(status_code=404, detail="Cache key not found")
    
    return {"message": f"Cache key {cache_key} deleted successfully"}

@app.post("/admin/cache/warm")
async def warm_cache():
    """Warm cache with common requests (useful for testing)"""
    sample_requests = [
        "Thank you for your email. I'll get back to you soon.",
        "I'd like to schedule a meeting to discuss this further.",
        "Could you please provide more details about this request?"
    ]
    
    warmed_keys = []
    for i, sample in enumerate(sample_requests):
        cache_key = hashlib.md5(f"sample_{i}".encode()).hexdigest()
        response_cache.set(cache_key, f"Sample response for: {sample}")
        warmed_keys.append(cache_key)
    
    return {
        "message": f"Cache warmed with {len(sample_requests)} entries",
        "warmed_keys": warmed_keys
    }

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("RespondX API v2.0.0 starting up...")
    logger.info(f"Configuration: Rate limit: {config['RATE_LIMIT_PER_MINUTE']}/min, "
                f"Max concurrent: {config['MAX_CONCURRENT_REQUESTS']}, "
                f"Cache size: {config['CACHE_MAX_SIZE']}")
    
    # Start background cleanup task
    asyncio.create_task(cleanup_caches())
    logger.info("Background cleanup task started")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("RespondX API shutting down...")
    # Clear caches to free memory
    response_cache.clear()
    token_cache.clear()
    logger.info("Caches cleared, shutdown complete")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path)
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    # Production settings
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        workers=1,  # Single worker for in-memory cache consistency
        access_log=True,
        log_level="info"
    )