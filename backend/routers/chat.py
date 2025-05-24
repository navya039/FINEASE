# routers/chat.py
from fastapi import APIRouter, HTTPException, status, Depends
from models.models import ChatMessage # Your ChatMessage model
from typing import List, Dict
import datetime
from bson import ObjectId # For MongoDB ObjectId handling

# Dependency to get database instance (client["your_db_name"])
async def get_db_instance():
    from main import client # Assuming 'client' is the global Motor client in main.py
    if client is None:
        # This should ideally not happen if startup event in main.py is successful
        raise HTTPException(status_code=503, detail="Database client not initialized. Service unavailable.")
    return client["chatbotdb"] # Replace "chatbotdb" with your actual database name

router = APIRouter(
    tags=["Chat"],
    responses={404: {"description": "Not found"}}
)

@router.post("/chat/send", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def send_chat_message(message: ChatMessage, db_instance = Depends(get_db_instance)):
    """
    Receives a user's chat message, saves it, simulates a bot response,
    saves the bot's response, and returns the bot's message.
    """
    try:
        # Ensure incoming message has a timestamp (Pydantic model might do this)
        if not message.timestamp:
            message.timestamp = datetime.datetime.now(datetime.timezone.utc)
        
        # Validate sender - should be 'user' for messages coming to this endpoint directly
        if message.sender != "user":
            raise HTTPException(status_code=400, detail="Sender must be 'user' for this endpoint.")

        # Convert user's Pydantic model to dict for MongoDB insertion
        # by_alias=True uses '_id' if 'id' is an alias. exclude_none=True is good practice.
        user_message_dict = message.dict(by_alias=True, exclude_none=True)
        
        # Remove 'id' if present, as MongoDB will generate '_id'
        if 'id' in user_message_dict:
            del user_message_dict['id']
        if '_id' in user_message_dict and user_message_dict['_id'] is None: # if alias _id is None
            del user_message_dict['_id']


        # Insert user's message
        user_insert_result = await db_instance.messages.insert_one(user_message_dict)
        # user_message_id = str(user_insert_result.inserted_id) # Not strictly needed to return user msg

        # --- Simulate Bot Response ---
        # In a real app, this is where you'd call Dialogflow, an LLM, or other AI logic
        bot_response_text = f"Finease Bot: I received your message: '{message.message}'. I'm still learning how to respond!"
        if "hello" in message.message.lower() or "hi" in message.message.lower():
            bot_response_text = f"Finease Bot: Hello there, {message.user_id}!"
        elif "market" in message.message.lower():
            bot_response_text = "Finease Bot: The market is quite volatile today. Consider long-term strategies."
        elif "budget" in message.message.lower():
            bot_response_text = "Finease Bot: To help with budgeting, could you tell me about your income and major expenses?"


        bot_message_obj = ChatMessage(
            user_id=message.user_id, # Bot message is part of the same user's conversation
            message=bot_response_text,
            sender="bot", # Clearly mark sender as 'bot'
            timestamp=datetime.datetime.now(datetime.timezone.utc) # Fresh timestamp for bot message
        )
        
        bot_message_dict = bot_message_obj.dict(by_alias=True, exclude_none=True)
        if 'id' in bot_message_dict: # Ensure no 'id' field before insertion
            del bot_message_dict['id']
        if '_id' in bot_message_dict and bot_message_dict['_id'] is None:
            del bot_message_dict['_id']

        # Insert bot's message
        bot_insert_result = await db_instance.messages.insert_one(bot_message_dict)
        
        # Prepare the bot message to be returned, now with its database ID
        # The ChatMessage model expects 'id', not '_id', for serialization if alias is set.
        # Pydantic model's 'id' field is an alias for '_id'.
        # So, we can construct the ChatMessage with the _id from DB.
        # The model's json_encoders should handle ObjectId to str conversion.
        
        # Fetch the newly inserted bot message to ensure all fields, including the generated _id, are correct
        # This is more robust than manually constructing.
        final_bot_message_from_db = await db_instance.messages.find_one({"_id": bot_insert_result.inserted_id})
        
        if not final_bot_message_from_db:
             raise HTTPException(status_code=500, detail="Failed to retrieve saved bot message.")

        final_bot_message_from_db['_id'] = str(final_bot_message_from_db['_id'])  # ✅ Fix ObjectId to string
        return ChatMessage(**final_bot_message_from_db)


    except HTTPException: # Re-raise HTTPExceptions to FastAPI
        raise
    except Exception as e:
        print(f"Error in send_chat_message: {e}") # Log the error
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/chat/history/{user_id}", response_model=List[ChatMessage])
async def get_chat_history(user_id: str, db_instance=Depends(get_db_instance)):
    """
    Retrieves the chat history for a given user ID, ordered by timestamp.
    """
    try:
        messages_cursor = db_instance.messages.find({"user_id": user_id}).sort("timestamp", 1)
        history = await messages_cursor.to_list(length=1000)

        # Convert _id (ObjectId) to str before creating ChatMessage model
        for msg in history:
            if "_id" in msg:
                msg["_id"] = str(msg["_id"])

        return [ChatMessage(**msg) for msg in history]

    except Exception as e:
        print(f"Error retrieving chat history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat history: {str(e)}")

@router.post("/dialogflow-webhook", status_code=status.HTTP_200_OK)
async def dialogflow_webhook(request_data: Dict, db_instance = Depends(get_db_instance)):
    print(f"Received Dialogflow webhook request: {request_data}")

    query_text = request_data.get("queryResult", {}).get("queryText", "No query text found")
    # Attempt to extract session_id, which often contains the user_id
    session_path = request_data.get("session", "")
    try:
        # Example session path: "projects/your-project-id/agent/sessions/user123"
        # Or "projects/your-project-id/agent/environments/your-env/users/-/sessions/user123"
        user_id_from_session = session_path.split('/')[-1]
        if not user_id_from_session or "sessions" in user_id_from_session : # Basic check if it's not a real ID
             user_id_from_session = "dialogflow_default_user" # Fallback user_id
    except Exception:
        user_id_from_session = "dialogflow_default_user"


    # Save user message received via Dialogflow
    user_msg_to_save = ChatMessage(
        user_id=user_id_from_session, 
        message=query_text, 
        sender="dialogflow", # Or 'user' if Dialogflow is just a proxy for user input
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )
    # Use the send_chat_message logic but adapt it or call a sub-function to avoid circular calls
    # For now, directly inserting:
    user_msg_dict = user_msg_to_save.dict(by_alias=True, exclude_none=True)
    if 'id' in user_msg_dict: del user_msg_dict['id']
    await db_instance.messages.insert_one(user_msg_dict)


    # Bot response text (from Dialogflow's fulfillment or generated here)
    bot_response_text = f"FinEasy (via Dialogflow): You said '{query_text}'. I'm processing this through Dialogflow."
    
    # Extract fulfillment text if available
    fulfillment_messages = request_data.get("queryResult", {}).get("fulfillmentMessages", [])
    if fulfillment_messages:
        # Assuming the first text response is what we want
        for fm_message in fulfillment_messages:
            if "text" in fm_message and "text" in fm_message["text"] and fm_message["text"]["text"]:
                bot_response_text = fm_message["text"]["text"][0]
                break
    
    # Save bot message
    bot_msg_to_save = ChatMessage(
        user_id=user_id_from_session, 
        message=bot_response_text, 
        sender="bot", # Or 'dialogflow_bot'
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )
    bot_msg_dict = bot_msg_to_save.dict(by_alias=True, exclude_none=True)
    if 'id' in bot_msg_dict: del bot_msg_dict['id']
    await db_instance.messages.insert_one(bot_msg_dict)

    # Standard Dialogflow fulfillment response structure
    return {
        "fulfillmentMessages": [
            {"text": {"text": [bot_response_text]}}
        ]
    }

# Sample endpoint (optional, can be removed)
@router.get("/chat") # Consider renaming or removing if it conflicts with other /chat uses
async def sample_chat_mongodb_test(db_instance = Depends(get_db_instance)):
    try:
        await db_instance.messages.insert_one({
            "user_id": "test_user",
            "message": "Test message from /chat endpoint!",
            "sender": "system",
            "timestamp": datetime.datetime.now(datetime.timezone.utc)
        })
        return {"reply": "Successfully inserted test message into MongoDB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect or insert: {str(e)}")
