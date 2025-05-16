import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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

# Load environment variables
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    logger.info(f".env file found at {env_path}")
    load_dotenv(env_path)
else:
    logger.error(f".env file NOT found at {env_path}")
    load_dotenv()

# Get Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables!")
    raise ValueError("GROQ_API_KEY is required. Check the logs above for details.")
else:
    logger.info(f"GROQ_API_KEY loaded successfully (key starts with: {GROQ_API_KEY[:10]}...)")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str
    useCustomPrompt: bool = False
    customPrompt: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI server started successfully")
    logger.info(f"Server running with Groq API key: {GROQ_API_KEY[:10]}...")

@app.post("/generate")
async def generate_reply(request: Request):
    try:
        data = await request.json()
        prompt_text = data.get('prompt', '')
        use_custom_prompt = data.get('useCustomPrompt', False)
        custom_prompt = data.get('customPrompt')

        if not prompt_text:
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")

        signature_template = f"""{EMAIL_CONFIG['default_closing']},
{USER_INFO['full_name']}
{USER_INFO['email']}
{USER_INFO['linkedin']}
{USER_INFO['mobile']}"""

        if use_custom_prompt and custom_prompt:
            system_prompt = f"""You are writing an email reply. Follow the user's specific instructions...
End your email with this signature:

{signature_template}

Remember: Only output the email content directly."""
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Original email: {prompt_text}\n\nInstructions: {custom_prompt}"}
            ]
        else:
            system_prompt = f"""You're a helpful assistant that writes professional Gmail replies...
{signature_template}"""
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend([
                {
                    "role": "user",
                    "content": "Reply to: Hi, I'd like to schedule a meeting to discuss the project timeline."
                },
                {
                    "role": "assistant",
                    "content": f"""Thank you for reaching out...
{signature_template}"""
                }
            ])
            messages.append({"role": "user", "content": f"Reply to this email:\n\n{prompt_text}"})

        payload = {
            "messages": messages,
            "model": MODEL_CONFIG['model'],
            "temperature": MODEL_CONFIG['temperature'],
            "max_tokens": MODEL_CONFIG['max_tokens']
        }

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    response_text = await resp.text()

                    if resp.status != 200:
                        try:
                            error_data = json.loads(response_text)
                            error_message = error_data.get("error", {}).get("message", "Unknown error")
                            return {"error": f"Groq API error: {error_message}"}
                        except:
                            return {"error": f"Groq API error: {resp.status} - {response_text[:200]}"}

                    result = json.loads(response_text)
                    if "choices" not in result or len(result["choices"]) == 0:
                        return {"error": "Invalid response format from Groq API"}

                    reply = result["choices"][0]["message"]["content"].strip()

                    if use_custom_prompt and custom_prompt:
                        meta_patterns = [
                            "Here is your response:",
                            "Here is the email:",
                            "Here's the reply:",
                            "Email body:",
                            "Reply:"
                        ]
                        lines = reply.split('\n')
                        cleaned_lines = [line for line in lines if all(p not in line for p in meta_patterns)]
                        reply = '\n'.join(cleaned_lines).strip()

                    return {"reply": reply}

            except aiohttp.ClientError as e:
                logger.error(f"Network error calling Groq API: {e}")
                return {"error": f"Network error: {str(e)}"}
            except asyncio.TimeoutError:
                logger.error("Timeout calling Groq API")
                return {"error": "The request to Groq API timed out. Please try again later."}

    except Exception as e:
        logger.error(f"Unexpected server error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

