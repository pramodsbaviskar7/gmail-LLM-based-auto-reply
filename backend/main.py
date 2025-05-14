import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp
from dotenv import load_dotenv
import json
import asyncio

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try multiple import methods
config_imported = False
USER_INFO = None
EMAIL_CONFIG = None
MODEL_CONFIG = None

# Method 1: Direct import
try:
    from config import USER_INFO, EMAIL_CONFIG, MODEL_CONFIG
    config_imported = True
    logger.info("Successfully imported configuration from config.py (method 1)")
    logger.info(f"Loaded user: {USER_INFO['full_name']}")
except ImportError as e:
    logger.warning(f"Could not import config.py (method 1): {e}")
    
    # Method 2: Import with sys.path modification
    import sys
    current_dir = Path(__file__).parent
    sys.path.insert(0, str(current_dir))
    
    try:
        import config
        USER_INFO = config.USER_INFO
        EMAIL_CONFIG = config.EMAIL_CONFIG
        MODEL_CONFIG = config.MODEL_CONFIG
        config_imported = True
        logger.info("Successfully imported configuration from config.py (method 2)")
        logger.info(f"Loaded user: {USER_INFO['full_name']}")
    except ImportError as e:
        logger.warning(f"Could not import config.py (method 2): {e}")
        
        # Method 3: Try to load from file directly
        config_file = current_dir / "config.py"
        if config_file.exists():
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location("config", config_file)
                config_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(config_module)
                USER_INFO = config_module.USER_INFO
                EMAIL_CONFIG = config_module.EMAIL_CONFIG
                MODEL_CONFIG = config_module.MODEL_CONFIG
                config_imported = True
                logger.info("Successfully imported configuration from config.py (method 3)")
                logger.info(f"Loaded user: {USER_INFO['full_name']}")
            except Exception as e:
                logger.error(f"Could not import config.py (method 3): {e}")

# Use defaults if all import methods failed
if not config_imported or not USER_INFO:
    logger.warning("Using default configuration values")
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
        "model": "llama3-8b-8192",
        "temperature": 0.7,
        "max_tokens": 500
    }

# Debug: Show current directory and environment loading
current_dir = Path(__file__).parent
logger.info(f"Current directory: {current_dir}")
logger.info(f"Looking for .env file at: {current_dir / '.env'}")

# Load environment variables with explicit path
env_path = current_dir / '.env'
if env_path.exists():
    logger.info(f".env file found at {env_path}")
    load_dotenv(env_path)
else:
    logger.error(f".env file NOT found at {env_path}")
    # Try loading from current working directory
    logger.info(f"Trying to load from current working directory: {os.getcwd()}")
    load_dotenv()

# Debug: Print all environment variables (be careful in production!)
logger.info("Environment variables loaded:")
for key, value in os.environ.items():
    if key.startswith("GROQ"):
        logger.info(f"{key}: {value[:10]}..." if value else f"{key}: None")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Additional debug
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables!")
    logger.error("Make sure your .env file contains: GROQ_API_KEY=your_actual_key")
    
    # Check if there's a similar key with different casing
    for key in os.environ.keys():
        if "GROQ" in key.upper() or "API" in key.upper():
            logger.info(f"Found similar key: {key}")
    
    # Create a sample .env file if it doesn't exist
    sample_env_path = current_dir / '.env.example'
    if not env_path.exists() and not sample_env_path.exists():
        with open(sample_env_path, 'w') as f:
            f.write("GROQ_API_KEY=your_groq_api_key_here\n")
        logger.info(f"Created sample .env file at {sample_env_path}")
        logger.info("Please copy .env.example to .env and add your actual API key")
    
    raise ValueError("GROQ_API_KEY is required. Check the logs above for details.")
else:
    logger.info(f"GROQ_API_KEY loaded successfully (key starts with: {GROQ_API_KEY[:10]}...)")

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware configured")

class PromptRequest(BaseModel):
    prompt: str

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI server started successfully")
    logger.info(f"Server running with Groq API key: {GROQ_API_KEY[:10]}...")
    logger.info(f"Using configuration for: {USER_INFO['full_name']} ({USER_INFO['email']})")

@app.post("/generate")
async def generate_reply(request: PromptRequest):
    try:
        prompt_text = request.prompt
        logger.info(f"Received prompt: {prompt_text[:100]}...")  # Log first 100 chars
        
        if not prompt_text:
            logger.error("Empty prompt received")
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Few-shot examples for consistent formatting with actual user info
        signature_template = f"""{EMAIL_CONFIG['default_closing']},
{USER_INFO['full_name']}
{USER_INFO['email']}
{USER_INFO['linkedin']}
{USER_INFO['mobile']}"""

        logger.info(f"Using signature template:\n{signature_template}")

        system_prompt = f"""You're a helpful assistant that writes professional Gmail replies. 
Always end your replies with a professional signature in this exact format:

{signature_template}

Important: Use this exact signature information in all replies. The name is {USER_INFO['full_name']}, email is {USER_INFO['email']}, LinkedIn is {USER_INFO['linkedin']}, and mobile is {USER_INFO['mobile']}."""

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

        payload = {
            "messages": messages,
            "model": MODEL_CONFIG['model'],
            "temperature": MODEL_CONFIG['temperature'],
            "max_tokens": MODEL_CONFIG['max_tokens']
        }
        
        logger.info(f"Sending request to Groq API with model: {payload['model']}")
        logger.debug(f"Request payload: {json.dumps(payload, indent=2)}")
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions", 
                    json=payload, 
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)  # 30 second timeout
                ) as resp:
                    logger.info(f"Groq API response status: {resp.status}")
                    
                    response_text = await resp.text()
                    logger.debug(f"Raw response: {response_text[:500]}...")  # Log first 500 chars
                    
                    if resp.status != 200:
                        logger.error(f"Groq API error: {resp.status}")
                        logger.error(f"Error response: {response_text}")
                        
                        # Try to parse error message
                        try:
                            error_data = json.loads(response_text)
                            error_message = error_data.get("error", {}).get("message", "Unknown error")
                            return {"error": f"Groq API error: {error_message}"}
                        except:
                            return {"error": f"Groq API error: {resp.status} - {response_text[:200]}"}
                    
                    # Parse successful response
                    try:
                        result = json.loads(response_text)
                        logger.debug(f"Parsed response: {json.dumps(result, indent=2)}")
                        
                        # Extract reply from response
                        if "choices" not in result or len(result["choices"]) == 0:
                            logger.error("No choices in Groq response")
                            return {"error": "Invalid response format from Groq API"}
                        
                        reply = result["choices"][0]["message"]["content"].strip()
                        logger.info(f"Generated reply: {reply[:100]}...")  # Log first 100 chars
                        
                        return {"reply": reply}
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse Groq response: {e}")
                        return {"error": f"Failed to parse response: {e}"}
                        
            except aiohttp.ClientError as e:
                logger.error(f"Network error calling Groq API: {e}")
                return {"error": f"Network error: {str(e)}"}
            except asyncio.TimeoutError:
                logger.error("Timeout calling Groq API")
                return {"error": "Request timeout - Groq API took too long to respond"}
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {e}", exc_info=True)
        return {"error": f"Internal server error: {str(e)}"}

@app.get("/config")
async def get_config():
    """Get current configuration (for debugging)"""
    return {
        "config_imported": config_imported,
        "user_info": USER_INFO,
        "email_config": EMAIL_CONFIG,
        "model_config": MODEL_CONFIG
    }

@app.get("/health")
async def health_check():
    """Health check endpoint to verify server is running"""
    logger.info("Health check requested")
    return {
        "status": "healthy",
        "api_key_configured": bool(GROQ_API_KEY),
        "api_key_preview": f"{GROQ_API_KEY[:10]}..." if GROQ_API_KEY else None,
        "env_file_path": str(env_path),
        "env_file_exists": env_path.exists(),
        "config_imported": config_imported,
        "current_user": USER_INFO['full_name']
    }

@app.get("/")
async def root():
    """Root endpoint"""
    logger.info("Root endpoint accessed")
    return {"message": "Gmail Auto Reply API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", reload=True)