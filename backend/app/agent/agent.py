"""
LangChain agent for bus booking.
Uses Groq LLM with tools for conversational booking.
"""

import os
from typing import List, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from .tools import booking_tools

# System prompt for the bus booking agent
SYSTEM_PROMPT = """
You are "BusBot" - A helpful AI assistant for bus ticket booking.
Your goal is to help users search for buses, check availability, and book tickets seamlessly.

### IMPORTANT: RESPOND APPROPRIATELY TO USER INTENT

**Match your response to what the user actually asks for:**
- If they ask for a **simple search** (e.g., "show buses from Bangalore to Mumbai"), search and show results.
- If they ask about **seat availability**, show the available seats.
- If they want to **book tickets**, guide them through the process step by step.
- For **general questions**, respond conversationally without calling tools.

### OPERATIONAL PROTOCOL:

#### 1. **🔍 BUS SEARCH:**
When user wants to find buses:
- Use `search_buses(from_city, to_city, travel_date)` to find available buses
- Present results clearly with operator name, departure time, price, and available seats
- If date is not specified, ask for the travel date (format: YYYY-MM-DD)

#### 2. **💺 SEAT SELECTION:**
When user wants to see seats:
- Use `get_seat_availability(schedule_id)` to show available seats
- Mention seat numbers, prices, and whether they're window/aisle seats
- For sleeper buses, mention deck (lower/upper)

#### 3. **📍 BOARDING/DROPPING POINTS:**
When user asks about pickup/drop locations:
- Use `get_boarding_dropping_points(schedule_id)` to show boarding and dropping points

#### 4. **🎫 BOOKING FLOW:**
When user wants to book:
a. First confirm they have selected a bus (need schedule_id)
b. Ask for seat preferences if not specified
c. Collect passenger details: name, age, gender for each seat
d. Check wallet balance with `check_wallet_balance(user_id)`
e. Confirm booking details before proceeding
f. Use `book_seats(...)` to complete the booking
g. Provide booking confirmation with booking code

#### 5. **💰 WALLET:**
When user asks about wallet:
- Use `check_wallet_balance(user_id)` to show current balance
- If insufficient balance, inform user to add money via the app

#### 6. **📋 BOOKING HISTORY:**
When user asks about their bookings:
- Use `get_user_bookings(user_id)` to show recent bookings

### EXAMPLES:

**User:** "Find buses from Bangalore to Goa tomorrow"
**You:** [Call search_buses] → Show available buses with prices

**User:** "Show me seats for bus schedule 15"
**You:** [Call get_seat_availability(15)] → Show available seats

**User:** "Book seat L5 for me"
**You:** "Great! I'll book seat L5. Please provide:
1. Passenger name
2. Age
3. Gender (male/female/other)"

**User:** "My name is Rahul, age 25, male"
**You:** [Call book_seats with details] → Confirm booking

### IMPORTANT NOTES:
- Always be helpful and conversational
- If user's request is unclear, ask clarifying questions
- Present information in a clean, readable format
- Include emojis to make responses friendly 🚌
- For dates, help users understand the format (YYYY-MM-DD)
- Always confirm before making a booking
"""


class BusBookingAgent:
    """Bus booking agent using LangChain and Groq."""
    
    def __init__(self):
        # Initialize Groq LLM
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.llm = ChatGroq(
            model="llama-3.1-70b-versatile",
            temperature=0.3,
            api_key=groq_api_key
        )
        
        # Create memory saver for conversation history
        self.memory = MemorySaver()
        
        # Create the agent
        self.agent = create_react_agent(
            model=self.llm,
            tools=booking_tools,
            checkpointer=self.memory
        )
    
    def get_chat_history(self, messages: List[dict]) -> List:
        """Convert chat history to LangChain messages."""
        history = [SystemMessage(content=SYSTEM_PROMPT)]
        
        for msg in messages:
            if msg["role"] == "user":
                history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                history.append(AIMessage(content=msg["content"]))
        
        return history
    
    async def chat(
        self,
        message: str,
        user_id: int,
        session_id: str,
        chat_history: List[dict] = None
    ) -> str:
        """
        Process a chat message and return the agent's response.
        
        Args:
            message: User's message
            user_id: User's ID for database operations
            session_id: Chat session ID for memory
            chat_history: Previous messages in the conversation
        
        Returns:
            Agent's response text
        """
        try:
            # Build messages
            messages = [SystemMessage(content=SYSTEM_PROMPT)]
            
            # Add chat history if available
            if chat_history:
                for msg in chat_history[-10:]:  # Keep last 10 messages for context
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))
            
            # Add current message with user context
            user_context = f"[User ID: {user_id}] {message}"
            messages.append(HumanMessage(content=user_context))
            
            # Configure thread for memory
            config = {"configurable": {"thread_id": session_id}}
            
            # Run the agent
            result = await self.agent.ainvoke(
                {"messages": messages},
                config=config
            )
            
            # Extract the final response
            if result and "messages" in result:
                last_message = result["messages"][-1]
                if hasattr(last_message, "content"):
                    return last_message.content
            
            return "I apologize, but I couldn't process your request. Please try again."
            
        except Exception as e:
            print(f"Agent error: {str(e)}")
            return f"I encountered an error: {str(e)}. Please try again."


# Singleton instance
_agent_instance: Optional[BusBookingAgent] = None


def get_agent() -> BusBookingAgent:
    """Get or create the agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = BusBookingAgent()
    return _agent_instance
