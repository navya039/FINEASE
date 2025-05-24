from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # NEW IMPORT for CORS (only one import needed)
from routers import chat # Import your router
import motor.motor_asyncio # For async MongoDB driver
import os # For environment variables
from dotenv import load_dotenv # For loading .env file

# Load environment variables (like MONGO_URL) as early as possible
load_dotenv()

app = FastAPI(
    title="FinEasy Backend API",
    description="Backend API for the FinEasy financial chatbot, handling chat history and Dialogflow fulfillment.",
    version="0.1.0",
)

# --- CORS Middleware ---
# Adjust 'origins' to include the URL where your React frontend runs
origins = [
    "http://localhost",
    "http://localhost:3003", # Default React dev server port
    # Add any other frontend URLs if needed for collaboration (e.g., friend's IP, deployed domain)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allows all headers
)
# --- END CORS Middleware ---

# All API endpoints will be accessed via /api/
app.include_router(chat.router, prefix="/api")

# --- Database Connection Management ---
# Global variable to hold the MongoDB client
client = None

@app.on_event("startup")
async def startup_db_client():
    global client # Declare client as global to modify it
    mongo_url = os.getenv("MONGO_URL")

    if not mongo_url:
        print("CRITICAL ERROR: MONGO_URL environment variable not set. Application will not start correctly.")
        raise ValueError("MONGO_URL environment variable is required.")

    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        # Ping the database to ensure connection is established
        await client.admin.command('ping')
        print("INFO: Successfully connected to MongoDB!")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to connect to MongoDB on startup: {e}")
        # Raise the exception to prevent the app from starting with a broken DB connection
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
        print("INFO: Disconnected from MongoDB.")

# --- Root Endpoint ---
@app.get("/")
async def root():
    return {"message": "FinEasy Backend is working! Visit /docs for API documentation."}