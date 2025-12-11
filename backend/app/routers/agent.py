from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid
import os
from ..database import get_db
from ..models.user import User
from ..models.chat import ChatSession, ChatMessage
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/agent", tags=["AI Agent"])


class ChatRequest(BaseModel):
    """Request schema for chat."""
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response schema for chat."""
    session_id: str
    message: str
    metadata: Optional[dict] = None


class ChatHistoryResponse(BaseModel):
    """Response schema for chat messages."""
    role: str
    content: str
    created_at: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI agent for bus booking.
    Agent can search buses, book tickets, check wallet, etc.
    """
    # Get or create session
    if request.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.session_id == request.session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.is_active == True
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or expired"
            )
    else:
        # Create new session
        session = ChatSession(
            user_id=current_user.id,
            session_id=str(uuid.uuid4())
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    
    # Save user message
    user_message = ChatMessage(
        session_id=session.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()
    
    # Get chat history for context
    history_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()
    
    chat_history = [
        {"role": m.role, "content": m.content}
        for m in history_messages[:-1]  # Exclude the just-added user message
    ]
    
    # Check if GROQ_API_KEY is available
    if not os.getenv("GROQ_API_KEY"):
        response_text = "⚠️ AI Agent is not configured. Please set GROQ_API_KEY environment variable."
    else:
        try:
            # Import and use the agent
            from ..agent import get_agent
            
            agent = get_agent()
            response_text = await agent.chat(
                message=request.message,
                user_id=current_user.id,
                session_id=session.session_id,
                chat_history=chat_history
            )
        except Exception as e:
            print(f"Agent error: {str(e)}")
            response_text = f"I encountered an error processing your request. Please try again. Error: {str(e)}"
    
    # Save assistant response
    assistant_message = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response_text
    )
    db.add(assistant_message)
    db.commit()
    
    return ChatResponse(
        session_id=session.session_id,
        message=response_text
    )


@router.get("/sessions", response_model=List[dict])
async def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's chat sessions."""
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.created_at.desc()).limit(10).all()
    
    return [
        {
            "session_id": s.session_id,
            "is_active": s.is_active,
            "created_at": str(s.created_at),
            "ended_at": str(s.ended_at) if s.ended_at else None
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/history", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat history for a session."""
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()
    
    return [
        ChatHistoryResponse(
            role=m.role,
            content=m.content,
            created_at=str(m.created_at)
        )
        for m in messages
    ]


@router.delete("/sessions/{session_id}")
async def end_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End a chat session."""
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    from datetime import datetime
    session.is_active = False
    session.ended_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Session ended successfully"}
