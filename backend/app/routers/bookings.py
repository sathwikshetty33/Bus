from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
import random
import string
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.bus import BusSchedule, Seat, BoardingPoint, DroppingPoint
from ..models.booking import Booking, BookingPassenger
from ..models.wallet import Wallet, Transaction
from ..schemas.booking import (
    BookingCreate, BookingResponse, BookingListResponse, 
    BookingPassengerResponse, BookingDetailResponse,
    BoardingPointInfo, DroppingPointInfo
)
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def generate_booking_code() -> str:
    """Generate a unique booking code."""
    prefix = "BK"
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{suffix}"


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new booking."""
    # Get bus schedule
    schedule = db.query(BusSchedule).filter(
        BusSchedule.id == booking_data.bus_schedule_id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bus schedule not found"
        )
    
    if schedule.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This bus is no longer available for booking"
        )
    
    # Validate and get seats
    seat_ids = [p.seat_id for p in booking_data.passengers]
    seats = db.query(Seat).filter(
        Seat.id.in_(seat_ids),
        Seat.bus_schedule_id == schedule.id
    ).all()
    
    if len(seats) != len(seat_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more seats not found"
        )
    
    # Check seat availability
    unavailable_seats = [s.seat_number for s in seats if not s.is_available]
    if unavailable_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seats {', '.join(unavailable_seats)} are not available"
        )
    
    # Calculate total amount
    total_amount = sum(seat.price for seat in seats)
    
    # If wallet payment, check balance
    if booking_data.payment_method == "wallet":
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        if not wallet or wallet.balance < total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient wallet balance"
            )
        
        # Deduct from wallet
        wallet.balance -= total_amount
        
        # Create transaction
        transaction = Transaction(
            wallet_id=wallet.id,
            type="debit",
            amount=total_amount,
            description=f"Booking payment"
        )
        db.add(transaction)
    
    # Create booking
    booking = Booking(
        booking_code=generate_booking_code(),
        user_id=current_user.id,
        bus_schedule_id=schedule.id,
        total_amount=total_amount,
        status="confirmed",
        payment_method=booking_data.payment_method,
        booking_source="app"
    )
    db.add(booking)
    db.flush()  # Get booking ID
    
    # Update transaction reference
    if booking_data.payment_method == "wallet":
        transaction.reference_id = booking.id
    
    # Create passengers and mark seats as unavailable
    seat_map = {s.id: s for s in seats}
    for passenger in booking_data.passengers:
        seat = seat_map[passenger.seat_id]
        seat.is_available = False
        
        booking_passenger = BookingPassenger(
            booking_id=booking.id,
            seat_id=passenger.seat_id,
            passenger_name=passenger.passenger_name,
            passenger_age=passenger.passenger_age,
            passenger_gender=passenger.passenger_gender
        )
        db.add(booking_passenger)
    
    # Update available seats count
    schedule.available_seats -= len(seats)
    
    db.commit()
    db.refresh(booking)
    
    # Build response with seat numbers
    passengers_response = []
    for bp in booking.passengers:
        seat = seat_map.get(bp.seat_id)
        passengers_response.append(BookingPassengerResponse(
            id=bp.id,
            seat_id=bp.seat_id,
            seat_number=seat.seat_number if seat else "N/A",
            passenger_name=bp.passenger_name,
            passenger_age=bp.passenger_age,
            passenger_gender=bp.passenger_gender
        ))
    
    return BookingResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        total_amount=booking.total_amount,
        status=booking.status,
        payment_method=booking.payment_method,
        booking_source=booking.booking_source,
        booked_at=booking.booked_at,
        cancelled_at=booking.cancelled_at,
        bus_schedule_id=booking.bus_schedule_id,
        passengers=passengers_response
    )


@router.get("", response_model=BookingListResponse)
async def get_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bookings for the current user."""
    bookings = db.query(Booking).options(
        joinedload(Booking.passengers),
        joinedload(Booking.bus_schedule)
    ).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.booked_at.desc()).all()
    
    booking_responses = []
    for booking in bookings:
        schedule = booking.bus_schedule
        bus = schedule.bus if schedule else None
        route = schedule.route if schedule else None
        
        passengers_response = []
        for bp in booking.passengers:
            seat = db.query(Seat).filter(Seat.id == bp.seat_id).first()
            passengers_response.append(BookingPassengerResponse(
                id=bp.id,
                seat_id=bp.seat_id,
                seat_number=seat.seat_number if seat else "N/A",
                passenger_name=bp.passenger_name,
                passenger_age=bp.passenger_age,
                passenger_gender=bp.passenger_gender
            ))
        
        booking_responses.append(BookingResponse(
            id=booking.id,
            booking_code=booking.booking_code,
            total_amount=booking.total_amount,
            status=booking.status,
            payment_method=booking.payment_method,
            booking_source=booking.booking_source,
            booked_at=booking.booked_at,
            cancelled_at=booking.cancelled_at,
            bus_schedule_id=booking.bus_schedule_id,
            bus_number=bus.bus_number if bus else None,
            bus_type=bus.bus_type if bus else None,
            operator_name=bus.operator.name if bus and bus.operator else None,
            from_city=route.from_city.name if route and route.from_city else None,
            to_city=route.to_city.name if route and route.to_city else None,
            travel_date=str(schedule.travel_date) if schedule else None,
            departure_time=str(schedule.departure_time) if schedule else None,
            arrival_time=str(schedule.arrival_time) if schedule else None,
            passengers=passengers_response
        ))
    
    return BookingListResponse(bookings=booking_responses, total=len(booking_responses))


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific booking."""
    booking = db.query(Booking).options(
        joinedload(Booking.passengers),
        joinedload(Booking.bus_schedule)
    ).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    schedule = booking.bus_schedule
    bus = schedule.bus if schedule else None
    route = schedule.route if schedule else None
    
    passengers_response = []
    for bp in booking.passengers:
        seat = db.query(Seat).filter(Seat.id == bp.seat_id).first()
        passengers_response.append(BookingPassengerResponse(
            id=bp.id,
            seat_id=bp.seat_id,
            seat_number=seat.seat_number if seat else "N/A",
            passenger_name=bp.passenger_name,
            passenger_age=bp.passenger_age,
            passenger_gender=bp.passenger_gender
        ))
    
    return BookingResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        total_amount=booking.total_amount,
        status=booking.status,
        payment_method=booking.payment_method,
        booking_source=booking.booking_source,
        booked_at=booking.booked_at,
        cancelled_at=booking.cancelled_at,
        bus_schedule_id=booking.bus_schedule_id,
        bus_number=bus.bus_number if bus else None,
        bus_type=bus.bus_type if bus else None,
        operator_name=bus.operator.name if bus and bus.operator else None,
        from_city=route.from_city.name if route and route.from_city else None,
        to_city=route.to_city.name if route and route.to_city else None,
        travel_date=str(schedule.travel_date) if schedule else None,
        departure_time=str(schedule.departure_time) if schedule else None,
        arrival_time=str(schedule.arrival_time) if schedule else None,
        passengers=passengers_response
    )


@router.get("/{booking_id}/details", response_model=BookingDetailResponse)
async def get_booking_details(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed booking info with tracking (boarding/dropping points)."""
    booking = db.query(Booking).options(
        joinedload(Booking.passengers),
        joinedload(Booking.bus_schedule).joinedload(BusSchedule.bus),
        joinedload(Booking.bus_schedule).joinedload(BusSchedule.route)
    ).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    schedule = booking.bus_schedule
    bus = schedule.bus if schedule else None
    route = schedule.route if schedule else None
    
    # Get passengers with seat info
    passengers_response = []
    for bp in booking.passengers:
        seat = db.query(Seat).filter(Seat.id == bp.seat_id).first()
        passengers_response.append(BookingPassengerResponse(
            id=bp.id,
            seat_id=bp.seat_id,
            seat_number=seat.seat_number if seat else "N/A",
            passenger_name=bp.passenger_name,
            passenger_age=bp.passenger_age,
            passenger_gender=bp.passenger_gender
        ))
    
    # Get boarding points
    boarding_points = []
    if schedule:
        bps = db.query(BoardingPoint).filter(
            BoardingPoint.bus_schedule_id == schedule.id
        ).order_by(BoardingPoint.time).all()
        for bp in bps:
            boarding_points.append(BoardingPointInfo(
                id=bp.id,
                name=bp.name,
                time=str(bp.time),
                address=bp.address,
                landmark=bp.landmark
            ))
    
    # Get dropping points
    dropping_points = []
    if schedule:
        dps = db.query(DroppingPoint).filter(
            DroppingPoint.bus_schedule_id == schedule.id
        ).order_by(DroppingPoint.time).all()
        for dp in dps:
            dropping_points.append(DroppingPointInfo(
                id=dp.id,
                name=dp.name,
                time=str(dp.time),
                address=dp.address,
                landmark=dp.landmark
            ))
    
    return BookingDetailResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        total_amount=booking.total_amount,
        status=booking.status,
        payment_method=booking.payment_method,
        booking_source=booking.booking_source,
        booked_at=booking.booked_at,
        cancelled_at=booking.cancelled_at,
        bus_schedule_id=booking.bus_schedule_id,
        bus_number=bus.bus_number if bus else None,
        bus_type=bus.bus_type if bus else None,
        operator_name=bus.operator.name if bus and bus.operator else None,
        operator_rating=bus.operator.rating if bus and bus.operator else None,
        amenities=bus.amenities if bus else None,
        from_city=route.from_city.name if route and route.from_city else None,
        to_city=route.to_city.name if route and route.to_city else None,
        distance_km=route.distance_km if route else None,
        duration_minutes=route.duration_minutes if route else None,
        travel_date=str(schedule.travel_date) if schedule else None,
        departure_time=str(schedule.departure_time) if schedule else None,
        arrival_time=str(schedule.arrival_time) if schedule else None,
        passengers=passengers_response,
        boarding_points=boarding_points,
        dropping_points=dropping_points
    )


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a booking and refund to wallet."""
    booking = db.query(Booking).options(
        joinedload(Booking.passengers)
    ).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled"
        )
    
    if booking.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed booking"
        )
    
    # Mark booking as cancelled
    booking.status = "cancelled"
    booking.cancelled_at = datetime.utcnow()
    
    # Release seats and get schedule
    schedule = db.query(BusSchedule).filter(
        BusSchedule.id == booking.bus_schedule_id
    ).first()
    
    for passenger in booking.passengers:
        seat = db.query(Seat).filter(Seat.id == passenger.seat_id).first()
        if seat:
            seat.is_available = True
    
    if schedule:
        schedule.available_seats += len(booking.passengers)
    
    # Refund to wallet if paid by wallet
    if booking.payment_method == "wallet":
        wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
        if wallet:
            wallet.balance += booking.total_amount
            
            transaction = Transaction(
                wallet_id=wallet.id,
                type="credit",
                amount=booking.total_amount,
                description=f"Refund for cancelled booking #{booking.booking_code}",
                reference_id=booking.id
            )
            db.add(transaction)
    
    db.commit()
    db.refresh(booking)
    
    passengers_response = []
    for bp in booking.passengers:
        seat = db.query(Seat).filter(Seat.id == bp.seat_id).first()
        passengers_response.append(BookingPassengerResponse(
            id=bp.id,
            seat_id=bp.seat_id,
            seat_number=seat.seat_number if seat else "N/A",
            passenger_name=bp.passenger_name,
            passenger_age=bp.passenger_age,
            passenger_gender=bp.passenger_gender
        ))
    
    return BookingResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        total_amount=booking.total_amount,
        status=booking.status,
        payment_method=booking.payment_method,
        booking_source=booking.booking_source,
        booked_at=booking.booked_at,
        cancelled_at=booking.cancelled_at,
        bus_schedule_id=booking.bus_schedule_id,
        passengers=passengers_response
    )
