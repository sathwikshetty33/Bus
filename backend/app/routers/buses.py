from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models.bus import City, Route, Operator, Bus, BusSchedule, Seat
from ..schemas.bus import (
    CityResponse, 
    BusScheduleResponse, 
    BusSearchRequest,
    SeatResponse,
    BusScheduleDetailResponse
)

router = APIRouter(prefix="/buses", tags=["Buses"])


@router.get("/cities", response_model=List[CityResponse])
async def get_cities(
    search: Optional[str] = Query(None, description="Search by city name"),
    popular_only: bool = Query(False, description="Only return popular cities"),
    db: Session = Depends(get_db)
):
    """Get list of cities."""
    query = db.query(City)
    
    if search:
        query = query.filter(
            or_(
                City.name.ilike(f"%{search}%"),
                City.code.ilike(f"%{search}%")
            )
        )
    
    if popular_only:
        query = query.filter(City.is_popular == True)
    
    cities = query.order_by(City.name).limit(20).all()
    return [CityResponse.model_validate(city) for city in cities]


@router.post("/search", response_model=List[BusScheduleResponse])
async def search_buses(
    search_data: BusSearchRequest,
    db: Session = Depends(get_db)
):
    """Search for buses between cities on a specific date."""
    # Find from city
    from_city = db.query(City).filter(
        or_(
            City.code.ilike(search_data.from_city),
            City.name.ilike(f"%{search_data.from_city}%")
        )
    ).first()
    
    if not from_city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{search_data.from_city}' not found"
        )
    
    # Find to city
    to_city = db.query(City).filter(
        or_(
            City.code.ilike(search_data.to_city),
            City.name.ilike(f"%{search_data.to_city}%")
        )
    ).first()
    
    if not to_city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{search_data.to_city}' not found"
        )
    
    # Find route
    route = db.query(Route).filter(
        Route.from_city_id == from_city.id,
        Route.to_city_id == to_city.id,
        Route.is_active == True
    ).first()
    
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No route found from {from_city.name} to {to_city.name}"
        )
    
    # Find bus schedules
    schedules = db.query(BusSchedule).options(
        joinedload(BusSchedule.bus).joinedload(Bus.operator),
        joinedload(BusSchedule.route).joinedload(Route.from_city),
        joinedload(BusSchedule.route).joinedload(Route.to_city)
    ).filter(
        BusSchedule.route_id == route.id,
        BusSchedule.travel_date == search_data.travel_date,
        BusSchedule.status == "scheduled",
        BusSchedule.available_seats > 0
    ).order_by(BusSchedule.departure_time).all()
    
    return [BusScheduleResponse.model_validate(schedule) for schedule in schedules]


@router.get("/{schedule_id}", response_model=BusScheduleDetailResponse)
async def get_bus_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Get bus schedule details with seats."""
    schedule = db.query(BusSchedule).options(
        joinedload(BusSchedule.bus).joinedload(Bus.operator),
        joinedload(BusSchedule.route).joinedload(Route.from_city),
        joinedload(BusSchedule.route).joinedload(Route.to_city),
        joinedload(BusSchedule.seats)
    ).filter(BusSchedule.id == schedule_id).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus schedule not found"
        )
    
    return BusScheduleDetailResponse.model_validate(schedule)


@router.get("/{schedule_id}/seats", response_model=List[SeatResponse])
async def get_seats(schedule_id: int, db: Session = Depends(get_db)):
    """Get seat availability for a bus schedule."""
    schedule = db.query(BusSchedule).filter(BusSchedule.id == schedule_id).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus schedule not found"
        )
    
    seats = db.query(Seat).filter(
        Seat.bus_schedule_id == schedule_id
    ).order_by(Seat.deck, Seat.row_number, Seat.column_number).all()
    
    return [SeatResponse.model_validate(seat) for seat in seats]
