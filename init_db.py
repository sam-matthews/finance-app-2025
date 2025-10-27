from database import Base, engine

# Import all models so they can be created
from models import User, Expense

def init_db():
    print("Creating database tables...")
    Base.metadata.drop_all(bind=engine)  # Drop existing tables
    Base.metadata.create_all(bind=engine)  # Create new tables
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()