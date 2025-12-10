from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, time, datetime


class CityResponse(BaseModel):
    """Schema for city response."""
    id: int
    name: str
    state: str
    code: str
    is_popular: bool

    class Config:
        from_attributes = True


class OperatorResponse(BaseModel):
    """Schema for operator response."""
    id: int
    name: str
    code: str
    logo_url: Optional[str]
    rating: float

    class Config:
        from_attributes = True


class RouteResponse(BaseModel):
    """Schema for route response."""
    id: int
    from_city: CityResponse
    to_city: CityResponse
    distance_km: int
    duration_minutes: int

    class Config:
        from_attributes = True


class BusResponse(BaseModel):
    """Schema for bus response."""
    id: int
    bus_number: str
    bus_type: str
    total_seats: int
    seat_layout: str
    amenities: List[str]
    operator: OperatorResponse

    class Config:
        from_attributes = True


class SeatResponse(BaseModel):
    """Schema for seat response."""
    id: int
    seat_number: str
    seat_type: str
    price: float
    is_available: bool
    is_ladies_only: bool
    row_number: int
    column_number: int
    deck: str

    class Config:
        from_attributes = True


class BusScheduleResponse(BaseModel):
    """Schema for bus schedule response."""
    id: int
    travel_date: date
    departure_time: time
    arrival_time: time
    base_price: float
    available_seats: int
    status: str
    bus: BusResponse
    route: RouteResponse

    class Config:
        from_attributes = True


class BusScheduleDetailResponse(BaseModel):
    """Schema for bus schedule with seats."""
    id: int
    travel_date: date
    departure_time: time
    arrival_time: time
    base_price: float
    available_seats: int
    status: str
    bus: BusResponse
    route: RouteResponse
    seats: List[SeatResponse]

    class Config:
        from_attributes = True


class BusSearchRequest(BaseModel):
    """Schema for bus search request."""
    from_city: str = Field(..., description="City code or name")
    to_city: str = Field(..., description="City code or name")
    travel_date: date
