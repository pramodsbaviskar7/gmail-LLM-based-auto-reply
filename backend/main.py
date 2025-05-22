import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import aiohttp
from dotenv import load_dotenv
import json
import asyncio
import json
import logging
import aiohttp
import asyncio
import tiktoken
from fastapi import APIRouter, Request, HTTPException
import json
import re

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
    useCustomPrompt: bool = False
    customPrompt: Optional[str] = None

class GroqAPIError(Exception):
    """Custom exception for Groq API errors"""
    def __init__(self, status_code, message):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Groq API error: {status_code} - {message}")

class NetworkError(Exception):
    """Custom exception for network errors"""
    pass

class TimeoutError(Exception):
    """Custom exception for timeout errors"""
    pass

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI server started successfully")
    logger.info(f"Server running with Groq API key: {GROQ_API_KEY[:10]}...")
    logger.info(f"Using configuration for: {USER_INFO['full_name']} ({USER_INFO['email']})")



MAX_TOKENS = MODEL_CONFIG.get("max_tokens", 32000)  # Safe max limit for mixtral or similar

def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))

def truncate_to_limit(text: str, token_limit: int, model: str = "gpt-3.5-turbo") -> str:
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")

    if not isinstance(text, str):
        raise ValueError(f"Expected string input for truncation but got {type(text).__name__}")

    tokens = enc.encode(text)
    return enc.decode(tokens[-token_limit:])  # Keep last tokens for latest context

@app.post("/analyze-thread")
async def analyze_email_thread(request: Request):
    try:
        try:
            data = await request.json()
            logger.info(f"Raw request data: {data}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse request JSON: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in request: {str(e)}")

        email_chain = data.get("thread", {}).get("completeThreadText", "")
        auto_truncate = data.get("autoTruncate", True)

        if not email_chain:
            logger.error("Empty email chain received")
            raise HTTPException(status_code=400, detail="Email chain cannot be empty")
        analysis_prompt = """
You are an AI email analyst. Analyze the following email thread and respond with **only** a strict, valid JSON object.

Your output must:
- Begin directly with '{' and end with '}'.
- Contain **no extra characters** outside the JSON.
- Include **no explanations**, **no headings**, and **no markdown formatting**.
- Exclude notes like "Here is your JSON", "Here’s the result:", "```json", or trailing dots (...).

Instructions:
1. Provide a clear and informative "summary" of the entire email conversation, covering key points, decisions, requests, and outcomes. The summary should be at least 3–5 sentences long and capture the main intent and progression of the conversation.
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

        prompt_model = MODEL_CONFIG["model"]
        total_input = f"{analysis_prompt}\n\nEmail Thread:\n{email_chain}"
        token_count = count_tokens(total_input, prompt_model)

        logger.info(f"Total token count: {token_count} for model {prompt_model}")

        if token_count > MAX_TOKENS:
            if auto_truncate:
                logger.warning(f"Input too long ({token_count} tokens). Truncating to fit within {MAX_TOKENS}.")
                safe_limit = MAX_TOKENS - count_tokens(analysis_prompt, prompt_model)
                email_chain = truncate_to_limit(email_chain, safe_limit, prompt_model)
            else:
                raise HTTPException(
                    status_code=413,
                    detail=f"Input exceeds token limit ({token_count} > {MAX_TOKENS}). Set autoTruncate=True to truncate automatically."
                )

        messages = [
            {"role": "system", "content": analysis_prompt},
            {"role": "user", "content": f"Email Thread:\n{email_chain}"}
        ]

        payload = {
            "messages": messages,
            "model": prompt_model,
            "temperature": 0.4,
            "max_tokens": 1500
        }

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        logger.info("Sending email analysis request to Groq API")

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=40)
                ) as resp:
                    response_text = await resp.text()
                    logger.debug(f"Groq response: {response_text[:500]}")

                    if resp.status != 200:
                        try:
                            error_data = json.loads(response_text)
                            error_message = error_data.get("error", {}).get("message", "Unknown error")
                        except json.JSONDecodeError:
                            error_message = response_text
                        raise GroqAPIError(resp.status, error_message)

                    try:
                        result = json.loads(response_text)
                        
                        analysis_str = result["choices"][0]["message"]["content"].strip()

                        try:
                            # Find the first complete JSON object (greedy match to last closing brace)
                            json_match = re.search(r'{.*}', analysis_str, re.DOTALL)
                            if not json_match:
                                raise ValueError("No valid JSON object found in response.")

                            json_str = json_match.group(0).rstrip(' .')  # Remove trailing dots or spaces
                            analysis_dict = json.loads(json_str)
                            logger.info(f"analysis: {analysis_dict}")
                            logger.info(f"type analysis: {type(analysis_dict)}")

                            return {"analysis": analysis_dict}

                        except json.JSONDecodeError as e:
                            logger.error(f"JSON decode error: {e}")
                            raise HTTPException(status_code=500, detail=f"Failed to parse valid JSON from model response.")
                        except Exception as e:
                            logger.error(f"Unexpected error while parsing JSON: {e}")
                            raise HTTPException(status_code=500, detail="Unexpected error parsing model output.")

                    except json.JSONDecodeError as e:
                        raise HTTPException(status_code=500, detail=f"Failed to parse Groq API response: {str(e)}")

            except aiohttp.ClientError as e:
                raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
            except asyncio.TimeoutError:
                raise HTTPException(status_code=504, detail="Groq API request timed out")

    except GroqAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Groq API error: {e.message}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/generate")
async def generate_reply(request: Request):
    try:
        # Get the raw data as dictionary
        try:
            data = await request.json()
            logger.info(f"Raw request data: {data}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse request JSON: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in request: {str(e)}")
        
        # Extract fields with proper handling of None/null
        prompt_text = data.get('prompt', '')
        use_custom_prompt = data.get('useCustomPrompt', False)
        custom_prompt = data.get('customPrompt')
        
        # Convert null to None if needed
        if custom_prompt is None or custom_prompt == "null":
            custom_prompt = None
            
        logger.info(f"Parsed - prompt: {prompt_text[:100]}...")
        logger.info(f"Parsed - useCustomPrompt: {use_custom_prompt}")
        logger.info(f"Parsed - customPrompt: {custom_prompt[:100] if custom_prompt else 'None'}...")
        
        if not prompt_text:
            logger.error("Empty prompt received")
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        if use_custom_prompt and not custom_prompt:
            logger.error("Custom prompt mode enabled but no custom prompt provided")
            raise HTTPException(status_code=400, detail="Custom prompt is required when useCustomPrompt is true")
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        user_identity = data.get("receiverEmail")
        print(user_identity)

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


        # signature_template = f"""{EMAIL_CONFIG['default_closing']},
        # {selected_user_info['full_name']}
        # {selected_user_info['email']}
        # {selected_user_info['linkedin']}
        # {selected_user_info['mobile']}"""


        logger.info(f"Using signature template:\n{signature_template}")

        # Different system prompts based on mode
        if use_custom_prompt and custom_prompt:
            # Custom mode: Use user's instructions with direct response
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
                            raise GroqAPIError(resp.status, error_message)
                        except json.JSONDecodeError:
                            raise GroqAPIError(resp.status, response_text[:200])
                    
                    # Parse successful response
                    try:
                        result = json.loads(response_text)
                        logger.debug(f"Parsed response: {json.dumps(result, indent=2)}")
                        
                        # Extract reply from response
                        if "choices" not in result or len(result["choices"]) == 0:
                            logger.error("No choices in Groq response")
                            raise HTTPException(status_code=500, detail="Invalid response format from Groq API")
                        
                        reply = result["choices"][0]["message"]["content"].strip()
                        logger.info(f"Generated reply: {reply[:100]}...")  # Log first 100 chars
                        
                        # Additional cleanup for custom prompts to remove any meta-text
                        if use_custom_prompt and custom_prompt:
                            # Remove common meta-text patterns
                            meta_patterns = [
                                "Here is your response:",
                                "Here is the email:",
                                "Here's the reply:",
                                "Here's your email:",
                                "Email body:",
                                "Email reply:",
                                "Response:",
                                "Reply:",
                            ]
                            
                            lines = reply.split('\n')
                            cleaned_lines = []
                            
                            for line in lines:
                                # Skip lines that are just meta-text
                                if any(pattern in line for pattern in meta_patterns) and len(line.strip()) < 30:
                                    continue
                                cleaned_lines.append(line)
                            
                            reply = '\n'.join(cleaned_lines).strip()
                        
                        return {"reply": reply}
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse Groq response: {e}")
                        raise HTTPException(status_code=500, detail=f"Failed to parse Groq API response: {str(e)}")
                        
            except aiohttp.ClientError as e:
                logger.error(f"Network error calling Groq API: {e}")
                raise HTTPException(status_code=503, detail=f"Network error connecting to Groq API: {str(e)}")
            except asyncio.TimeoutError:
                logger.error("Timeout calling Groq API")
                raise HTTPException(status_code=504, detail="Request timeout - Groq API took too long to respond")
                
    except GroqAPIError as e:
        logger.error(f"Groq API error: {e}")
        raise HTTPException(status_code=e.status_code, detail=f"Groq API error: {e.message}")
    except HTTPException:
        # Re-raise HTTP exceptions as they already have the correct format
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/generate-flexible")
async def generate_reply_flexible(request: Request):
    """Flexible endpoint that accepts any JSON"""
    try:
        try:
            body = await request.json()
            logger.info(f"Flexible endpoint received: {body}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse request JSON: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON in request: {str(e)}")
        
        # Extract required and optional fields
        prompt_text = body.get('prompt', '')
        use_custom_prompt = body.get('useCustomPrompt', False)
        custom_prompt = body.get('customPrompt', None)
        
        if not prompt_text:
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
            
        # Reuse the same logic as the main generate function
        # Create a new request with the extracted fields
        request_data = {
            "prompt": prompt_text,
            "useCustomPrompt": use_custom_prompt,
            "customPrompt": custom_prompt
        }
        
        # Call the main generate function
        return await generate_reply(Request(scope={"type": "http"}, receive=None, send=None))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flexible endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/debug-generate")
async def debug_generate_reply(request: Request):
    """Debug endpoint to see raw request data"""
    try:
        body = await request.json()
        logger.info(f"Raw request data: {body}")
        return {"received": body, "status": "debug"}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse request JSON: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON in request: {str(e)}")
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Debug endpoint error: {str(e)}")

@app.get("/config")
async def get_config():
    """Get current configuration (for debugging)"""
    try:
        return {
            "config_imported": config_imported,
            "user_info": USER_INFO,
            "email_config": EMAIL_CONFIG,
            "model_config": MODEL_CONFIG
        }
    except Exception as e:
        logger.error(f"Config endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve configuration: {str(e)}")

from fastapi import FastAPI, HTTPException, Request, Response
@app.head("/health")
async def health_check_head():
    """Health check endpoint using HEAD method (lightweight version)"""
    try:
        logger.info("Health check HEAD requested")
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Health check HEAD error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    try:
        logger.info("Root endpoint accessed")
        return {"message": "Gmail Auto Reply API", "status": "running"}
    except Exception as e:
        logger.error(f"Root endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Root endpoint error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", reload=True)