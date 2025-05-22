# routers/chat.py
from fastapi import APIRouter, HTTPException, status, Depends
from models.models import ChatMessage # Import your new ChatMessage model
from typing import List, Dict
import datetime # Used for formatting timestamp

# Assume database connection setup is in main.py and client is global
# We'll get the 'db' instance via a dependency for cleaner code.
async def get_db_instance():
    # This function will be called by FastAPI to inject the db object
    # It imports 'client' from 'main' where the actual connection is established
    from main import client
    if client is None:
        raise HTTPException(status_code=500, detail="Database client not initialized.")
    return client["chatbotdb"] # Return the specific database instance ('chatbotdb' is your DB name)

router = APIRouter(
    tags=["Chat"], # Group endpoints nicely in Swagger UI
    responses={404: {"description": "Not found"}} # Common response for this router
)

# --- Existing GET /chat (for testing initial database connection) ---
@router.get("/chat")
async def sample_chat(db_instance = Depends(get_db_instance)):
    """
    Test endpoint to verify MongoDB connection by inserting a sample message.
    You can keep this for initial connection test, or remove later.
    """
    try:
        # Insert a sample message into the 'messages' collection
        # MongoDB will create 'chatbotdb' and 'messages' if they don't exist
        await db_instance.messages.insert_one({"message": "Test message from /chat endpoint!"})
        return {"reply": "Successfully inserted test message into MongoDB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect or insert: {str(e)}")


# --- NEW: POST /chat/send (To store new messages) ---
@router.post("/chat/send", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def send_chat_message(message: ChatMessage, db_instance = Depends(get_db_instance)):
    """
    Receives a new chat message (from user or bot) and stores it in the database.
    """
    try:
        if not message.timestamp:
            message.timestamp = datetime.datetime.now()

        message_dict = message.dict(by_alias=True, exclude_none=True)

        result = await db_instance.messages.insert_one(message_dict)
        message.id = str(result.inserted_id)

        return message
    except Exception as e:
        print(f"Error sending message to DB: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@router.get("/chat/history/{user_id}", response_model=str) # Response is now a single string
async def get_chat_history(user_id: str, db_instance = Depends(get_db_instance)):
    """
    Retrieves the chat history for a given user ID and returns it as a formatted string.
    This endpoint is for testing/debugging and outputs conversation-like text.
    """
    try:
        messages_list = []
        # Find messages for the specific user_id, sorted by timestamp in ascending order
        cursor = db_instance.messages.find({"user_id": user_id}).sort("timestamp", 1)

        # Iterate through fetched documents and convert to ChatMessage models
        for doc in await cursor.to_list(length=1000):
            # Pydantic 1.x with json_encoders will handle ObjectId to string conversion for output
            messages_list.append(ChatMessage(**doc))

        if not messages_list:
            return f"--- No chat history found for user: '{user_id}' ---"

        # Format the messages into a single, readable string
        formatted_history = f"--- Chat History for User: {user_id} ---\n\n"
        for msg in messages_list:
            time_str = msg.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            sender_display = "You" if msg.sender == "user" else "FinEasy Bot"
            formatted_history += f"[{time_str}] {sender_display}: {msg.message}\n"

        formatted_history += "\n--- End of History ---"
        return formatted_history
    except Exception as e:
        print(f"Error retrieving chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat history: {str(e)}")

# ... (rest of the file content below this point is unchanged) ...
# --- Placeholder: POST /dialogflow-webhook ---
@router.post("/dialogflow-webhook", status_code=status.HTTP_200_OK)
async def dialogflow_webhook(request_data: Dict, db_instance = Depends(get_db_instance)):
    """
    Placeholder for Dialogflow fulfillment webhook.
    Receives requests from Dialogflow and sends a response.
    This is where you'll integrate your NLP logic.
    """
    print(f"Received Dialogflow webhook request: {request_data}")
    # --- Your Dialogflow fulfillment logic will go here ---
    
    # Example: Extract some info and provide a placeholder response
    query_text = request_data.get("queryResult", {}).get("queryText", "No query text found")
    session_id = request_data.get("session", "").split('/')[-1] # Extract session ID from Dialogflow session path

    # For demonstration: Save user's message from Dialogflow
    user_msg_to_save = ChatMessage(user_id=session_id, message=query_text, sender="user")
    await send_chat_message(user_msg_to_save, db_instance=db_instance)

    # Craft a simple response for Dialogflow
    bot_response_text = f"FinEasy says: I received your message about '{query_text}'. I'm still learning!"
    
    # For demonstration: Save bot's response
    bot_msg_to_save = ChatMessage(user_id=session_id, message=bot_response_text, sender="bot")
    await send_chat_message(bot_msg_to_save, db_instance=db_instance)

    return {
        "fulfillmentMessages": [
            {"text": {"text": [bot_response_text]}}
        ]
    }