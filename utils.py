import os
import secrets
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Secret Key for encryption (must be 32 bytes base64 encoded)
SECRET_KEY = os.getenv("SECRET_KEY")

# Initialize Fernet if secret key is present
cipher_suite = Fernet(SECRET_KEY.encode()) if SECRET_KEY else None

def generate_hexa() -> str:
    """Generate a unique 32-character hexadecimal string."""
    return secrets.token_hex(16)

def encode_hexa(hexa_code: str) -> str:
    """Encode the hexa code using the unique secret with Fernet."""
    if not cipher_suite:
        raise ValueError("SECRET_KEY is not defined in environment variables.")
    
    encoded_bytes = cipher_suite.encrypt(hexa_code.encode())
    return encoded_bytes.decode()

def get_base_url() -> str:
    """Get the base URL from environment OR fallback to localhost."""
    return os.getenv("BASE_URL", "http://localhost:8080").rstrip("/")
