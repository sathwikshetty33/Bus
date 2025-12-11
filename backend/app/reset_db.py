"""
Reset and reseed the database.
Run with: python -m app.reset_db
"""

from .database import engine, Base, SessionLocal
from .models import *  # Import all models to register them
from .seed_data import seed_database


def reset_database():
    """Drop all tables and recreate them."""
    print("⚠️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ Tables dropped")
    
    print("🔧 Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")
    
    # Now seed
    print("\n")
    seed_database()


if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA. Type 'yes' to confirm: ")
    if confirm.lower() == 'yes':
        reset_database()
    else:
        print("Cancelled.")
