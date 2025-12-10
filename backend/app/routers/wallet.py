from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.wallet import Wallet, Transaction
from ..schemas.wallet import WalletResponse, WalletAddMoney, TransactionResponse, TransactionListResponse
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's wallet balance."""
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    
    if not wallet:
        # Create wallet if doesn't exist
        wallet = Wallet(user_id=current_user.id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    
    return WalletResponse.model_validate(wallet)


@router.post("/add", response_model=WalletResponse)
async def add_money(
    data: WalletAddMoney,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add money to wallet (mock payment)."""
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    
    if not wallet:
        wallet = Wallet(user_id=current_user.id, balance=0.0)
        db.add(wallet)
        db.flush()
    
    # Add money (in real app, this would involve payment gateway)
    wallet.balance += data.amount
    
    # Create transaction record
    transaction = Transaction(
        wallet_id=wallet.id,
        type="credit",
        amount=data.amount,
        description="Added money to wallet"
    )
    db.add(transaction)
    
    db.commit()
    db.refresh(wallet)
    
    return WalletResponse.model_validate(wallet)


@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get wallet transaction history."""
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    
    if not wallet:
        return TransactionListResponse(transactions=[], total=0)
    
    # Get total count
    total = db.query(Transaction).filter(Transaction.wallet_id == wallet.id).count()
    
    # Get transactions with pagination
    transactions = db.query(Transaction).filter(
        Transaction.wallet_id == wallet.id
    ).order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()
    
    return TransactionListResponse(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=total
    )
