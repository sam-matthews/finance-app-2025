from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import ExpenseType, Account

# Create all tables
Base.metadata.create_all(bind=engine)

def init_lookup_tables():
    db = SessionLocal()
    try:
        # Initialize expense types if they don't exist
        expense_types = [
            {"name": "Daily", "description": "Day to day expenses."},
            {"name": "Entertainment", "description": "Restaurants, Bars etc"},
            {"name": "Holiday", "description": "Holiday Expenses"},
        ]
        
        for type_data in expense_types:
            if not db.query(ExpenseType).filter_by(name=type_data["name"]).first():
                db.add(ExpenseType(**type_data))
        
        # Initialize accounts if they don't exist
        accounts = [
            {"name": "ASB Orbit", "description": "ASB Orbit Account"},
            {"name": "ANZ Credit", "description": "ANZ Visa Credit Card"},
        ]
        
        for account_data in accounts:
            if not db.query(Account).filter_by(name=account_data["name"]).first():
                db.add(Account(**account_data))
        
        db.commit()
        print("Lookup tables initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing lookup tables: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_lookup_tables()