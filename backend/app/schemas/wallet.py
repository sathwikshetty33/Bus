from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class WalletResponse(BaseModel):
    """Schema for wallet response."""
    id: int
    balance: float
    updated_at: datetime

    class Config:
        from_attributes = True


class WalletAddMoney(BaseModel):
    """Schema for adding money to wallet."""
    amount: float = Field(..., gt=0, le=100000)


class TransactionResponse(BaseModel):
    """Schema for transaction response."""
    id: int
    type: str
    amount: float
    description: str
    reference_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Schema for list of transactions.""" 
    transactions: List[TransactionResponse]
    total: int
