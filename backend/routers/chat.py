# backend/routers/chat.py

from fastapi import APIRouter, HTTPException, status, Depends
from models.models import ChatMessage
from typing import List
import datetime

# Import the main logic function from our new bot_logic.py file
from .bot_logic import get_final_response

async def get_db_instance():
    from main import client
    if client is None:
        raise HTTPException(status_code=503, detail="Database client not initialized.")
    return client["chatbotdb"] 

router = APIRouter(
    tags=["Chat"],
    responses={404: {"description": "Not found"}}
)

@router.post("/chat/send", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def send_chat_message(message: ChatMessage, db_instance = Depends(get_db_instance)):
    """
    Receives a user's message, saves it, gets a response from our
    bot logic, saves the bot's response, and returns it.
    """
    try:
        # 1. Save the user's message
        user_message_dict = message.dict(by_alias=True, exclude_none=True)
        if 'id' in user_message_dict: del user_message_dict['id']
        await db_instance.messages.insert_one(user_message_dict)

        # 2. Get the response by calling our clean logic function
        bot_response_text = get_final_response(message.message)
        
        # 3. Save the bot's response
        bot_message_obj = ChatMessage(
            user_id=message.user_id,
            message=bot_response_text,
            sender="bot",
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        bot_message_dict = bot_message_obj.dict(by_alias=True, exclude_none=True)
        if 'id' in bot_message_dict: del bot_message_dict['id']
        bot_insert_result = await db_instance.messages.insert_one(bot_message_dict)
        
        # 4. Return the response to the frontend
        final_bot_message_from_db = await db_instance.messages.find_one({"_id": bot_insert_result.inserted_id})
        final_bot_message_from_db['_id'] = str(final_bot_message_from_db['_id'])
        return ChatMessage(**final_bot_message_from_db)

    except Exception as e:
        print(f"An unexpected error occurred in send_chat_message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history/{user_id}", response_model=List[ChatMessage])
async def get_chat_history(user_id: str, db_instance=Depends(get_db_instance)):
    # This endpoint is unchanged
    try:
        messages_cursor = db_instance.messages.find({"user_id": user_id}).sort("timestamp", 1)
        history = await messages_cursor.to_list(length=1000)
        for msg in history:
            if "_id" in msg:
                msg["_id"] = str(msg["_id"])
        return [ChatMessage(**msg) for msg in history]
    except Exception as e:
        print(f"Error retrieving chat history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat history: {str(e)}")
