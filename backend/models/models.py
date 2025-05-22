# models/models.py
from pydantic import BaseModel, Field
from typing import Optional
import datetime

class ChatMessage(BaseModel):
    """
    Represents a single chat message in the conversation.
    """
    # We will handle the conversion of ObjectId to string directly when fetching from DB.
    # So, 'id' is always treated as a string by Pydantic.
    id: Optional[str] = Field(alias='_id', default=None)
    user_id: str = Field(..., min_length=1, max_length=50)
    message: str = Field(..., min_length=1)
    sender: str = Field(..., pattern="^(user|bot|dialogflow)$")
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)

    class Config:
        populate_by_name = True
        # No arbitrary_types_allowed = True is needed because we're not using custom types
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "message": "Hello, what is FinEasy?",
                "sender": "user"
            }
        }