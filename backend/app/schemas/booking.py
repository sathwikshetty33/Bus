from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PassengerCreate(BaseModel):
    """Schema for passenger details in booking."""
    seat_id: int
    passenger_name: str = Field(..., min_length=2, max_length=100)
    passenger_age: int = Field(..., ge=1, le=120)
    passenger_gender: str = Field(..., pattern="^(male|female|other)$")


class BookingCreate(BaseModel):
    """Schema for creating a booking."""
    bus_schedule_id: int
    passengers: List[PassengerCreate]
    payment_method: str = Field(..., pattern="^(wallet|card|upi)$")


class BookingPassengerResponse(BaseModel):
    """Schema for passenger in booking response."""
    id: int
    seat_id: int
    seat_number: str
    passenger_name: str
    passenger_age: int
    passenger_gender: str

    class Config:
        from_attributes = True


class BookingResponse(BaseModel):
    """Schema for booking response."""
    id: int
    booking_code: str
    total_amount: float
    status: str
    payment_method: str
    booking_source: str
    booked_at: datetime
    cancelled_at: Optional[datetime]
    bus_schedule_id: int
    # Flattened bus info
    bus_number: Optional[str] = None
    bus_type: Optional[str] = None
    operator_name: Optional[str] = None
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    travel_date: Optional[str] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    passengers: List[BookingPassengerResponse] = []

    class Config:
        from_attributes = True


class BookingListResponse(BaseModel):
    """Schema for list of bookings."""
    bookings: List[BookingResponse]
    total: int


class BoardingPointInfo(BaseModel):
    """Schema for boarding point info."""
    id: int
    name: str
    time: str
    address: Optional[str] = None
    landmark: Optional[str] = None

    class Config:
        from_attributes = True


class DroppingPointInfo(BaseModel):
    """Schema for dropping point info."""
    id: int
    name: str
    time: str
    address: Optional[str] = None
    landmark: Optional[str] = None

    class Config:
        from_attributes = True


class BookingDetailResponse(BaseModel):
    """Detailed booking response with tracking info."""
    id: int
    booking_code: str
    total_amount: float
    status: str
    payment_method: str
    booking_source: str
    booked_at: datetime
    cancelled_at: Optional[datetime]
    bus_schedule_id: int
    # Bus info
    bus_number: Optional[str] = None
    bus_type: Optional[str] = None
    operator_name: Optional[str] = None
    operator_rating: Optional[float] = None
    amenities: Optional[List[str]] = None
    # Route info
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    distance_km: Optional[int] = None
    duration_minutes: Optional[int] = None
    # Schedule info
    travel_date: Optional[str] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    # Passengers
    passengers: List[BookingPassengerResponse] = []
    # Tracking - boarding and dropping points
    boarding_points: List[BoardingPointInfo] = []
    dropping_points: List[DroppingPointInfo] = []

    class Config:
        from_attributes = True
