import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from routers import chat
from compare_module.summarizer import Summarizer
from compare_module.extractor import extract_interest, extract_lockin
from compare_module.scorer import score
from compare_module.utils import extract_text_from_pdf
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="FinEasy Backend API",
    description="Backend API for the FinEasy financial chatbot, handling chat history and Dialogflow fulfillment.",
    version="0.1.0",
)

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")

client = None
database = None

@app.on_event("startup")
async def startup_db_client():
    global client, database
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        print("CRITICAL ERROR: MONGO_URL environment variable not set. Application will not start correctly.")
        raise ValueError("MONGO_URL environment variable is required.")

    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
        await client.admin.command('ping')
        print("INFO: Successfully connected to MongoDB Atlas!")
        database = client["finease"]
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to connect to MongoDB Atlas on startup: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    global client
    if client:
        client.close()
        print("INFO: Disconnected from MongoDB Atlas.")

@app.get("/")
async def root():
    return {"message": "FinEasy Backend is working! Visit /docs for API documentation."}

@app.post("/compare/")
async def compare_docs(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    min_interest: float = Form(0.0),
    max_lockin: int = Form(100),
    product_type: str = Form("loan")  # "loan" or "fd"
):
    if file1.filename.endswith('.pdf'):
        text1 = extract_text_from_pdf(file1.file)
    else:
        text1 = (await file1.read()).decode()
    if file2.filename.endswith('.pdf'):
        text2 = extract_text_from_pdf(file2.file)
    else:
        text2 = (await file2.read()).decode()

    summarizer = Summarizer()
    summary1 = summarizer.summarize(text1)
    summary2 = summarizer.summarize(text2)

    data1 = {
        'interest': extract_interest(text1),
        'lockin': extract_lockin(text1)
    }
    data2 = {
        'interest': extract_interest(text2),
        'lockin': extract_lockin(text2)
    }

    user_prefs = {
        'min_interest': min_interest,
        'max_lockin': max_lockin
    }

    score1 = score(data1, user_prefs, product_type)
    score2 = score(data2, user_prefs, product_type)

    if score1 > score2:
        recommendation = "Document 1 is better"
    elif score2 > score1:
        recommendation = "Document 2 is better"
    else:
        recommendation = "Both documents are similar"

    return {
        "recommendation": recommendation,
        "doc1": {"summary": summary1, "data": data1, "score": score1},
        "doc2": {"summary": summary2, "data": data2, "score": score2}
    }

@app.post("/extract-fields/")
async def extract_fields_endpoint(file: UploadFile = File(...)):
    if file.filename.endswith('.pdf'):
        text = extract_text_from_pdf(file.file)
    else:
        text = (await file.read()).decode()
    interest = extract_interest(text)
    lockin = extract_lockin(text)
    return {"interest": interest, "lockin": lockin}
