from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .routers import auth_router, buses_router, bookings_router, wallet_router, agent_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Initialize database tables
    init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Application shutting down")


app = FastAPI(
    title="Bus Booking API",
    description="A RedBus-like bus booking API with AI-powered booking agent",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(buses_router)
app.include_router(bookings_router)
app.include_router(wallet_router)
app.include_router(agent_router)


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "message": "Bus Booking API is running",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "services": {
            "auth": "up",
            "buses": "up",
            "bookings": "up",
            "wallet": "up",
            "agent": "up"
        }
    }
