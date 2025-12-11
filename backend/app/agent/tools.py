"""
LangChain tools for the bus booking AI agent.
"""

from langchain_core.tools import tool
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
import json

from ..database import SessionLocal
from ..models.bus import City, Route, Bus, BusSchedule, Seat, BoardingPoint, DroppingPoint
from ..models.booking import Booking, BookingPassenger
from ..models.wallet import Wallet, Transaction
from ..models.user import User


def get_db_session():
    """Get a database session."""
    return SessionLocal()


@tool
def search_cities(query: str) -> str:
    """
    Search for available cities by name or code.
    Use this to find city IDs for bus searches.
    
    Args:
        query: City name or code to search for (e.g., "Bengaluru", "BLR", "Mumbai")
    
    Returns:
        List of matching cities with their IDs and codes
    """
    db = get_db_session()
    try:
        cities = db.query(City).filter(
            (City.name.ilike(f"%{query}%")) | (City.code.ilike(f"%{query}%"))
        ).limit(10).all()
        
        if not cities:
            return f"No cities found matching '{query}'. Please try a different search term."
        
        result = []
        for city in cities:
            result.append({
                "id": city.id,
                "name": city.name,
                "state": city.state,
                "code": city.code
            })
        return json.dumps(result, indent=2)
    finally:
        db.close()


@tool
def get_popular_cities() -> str:
    """
    Get list of popular cities for bus travel.
    Use this when user wants to see available destinations.
    
    Returns:
        List of popular cities
    """
    db = get_db_session()
    try:
        cities = db.query(City).filter(City.is_popular == True).all()
        
        result = []
        for city in cities:
            result.append({
                "name": city.name,
                "state": city.state,
                "code": city.code
            })
        return json.dumps(result, indent=2)
    finally:
        db.close()


@tool
def search_buses(from_city: str, to_city: str, travel_date: str) -> str:
    """
    Search for available buses between two cities on a specific date.
    
    Args:
        from_city: Source city name or code (e.g., "Bengaluru", "BLR")
        to_city: Destination city name or code (e.g., "Mumbai", "BOM")
        travel_date: Travel date in YYYY-MM-DD format (e.g., "2024-12-15")
    
    Returns:
        List of available buses with schedule IDs, prices, and seat availability
    """
    db = get_db_session()
    try:
        # Find cities
        from_city_obj = db.query(City).filter(
            (City.name.ilike(f"%{from_city}%")) | (City.code.ilike(f"%{from_city}%"))
        ).first()
        
        to_city_obj = db.query(City).filter(
            (City.name.ilike(f"%{to_city}%")) | (City.code.ilike(f"%{to_city}%"))
        ).first()
        
        if not from_city_obj:
            return f"Source city '{from_city}' not found. Use search_cities to find valid cities."
        if not to_city_obj:
            return f"Destination city '{to_city}' not found. Use search_cities to find valid cities."
        
        # Parse date
        try:
            travel_date_parsed = datetime.strptime(travel_date, "%Y-%m-%d").date()
        except ValueError:
            return "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-12-15)"
        
        # Find routes
        routes = db.query(Route).filter(
            Route.from_city_id == from_city_obj.id,
            Route.to_city_id == to_city_obj.id
        ).all()
        
        if not routes:
            return f"No routes found from {from_city_obj.name} to {to_city_obj.name}"
        
        route_ids = [r.id for r in routes]
        
        # Find schedules
        schedules = db.query(BusSchedule).options(
            joinedload(BusSchedule.bus).joinedload(Bus.operator),
            joinedload(BusSchedule.route)
        ).filter(
            BusSchedule.route_id.in_(route_ids),
            BusSchedule.travel_date == travel_date_parsed,
            BusSchedule.status == "scheduled",
            BusSchedule.available_seats > 0
        ).order_by(BusSchedule.departure_time).all()
        
        if not schedules:
            return f"No buses available from {from_city_obj.name} to {to_city_obj.name} on {travel_date}"
        
        result = []
        for s in schedules:
            result.append({
                "schedule_id": s.id,
                "operator": s.bus.operator.name,
                "bus_type": s.bus.bus_type,
                "bus_number": s.bus.bus_number,
                "departure_time": str(s.departure_time)[:5],
                "arrival_time": str(s.arrival_time)[:5],
                "available_seats": s.available_seats,
                "price_from": s.base_price,
                "amenities": s.bus.amenities[:3] if s.bus.amenities else []
            })
        
        return json.dumps({
            "route": f"{from_city_obj.name} → {to_city_obj.name}",
            "date": travel_date,
            "buses_found": len(result),
            "buses": result
        }, indent=2)
    finally:
        db.close()


@tool
def get_seat_availability(schedule_id: int) -> str:
    """
    Get seat availability and layout for a specific bus schedule.
    
    Args:
        schedule_id: The bus schedule ID (obtained from search_buses)
    
    Returns:
        Seat map with available seats, prices, and positions
    """
    db = get_db_session()
    try:
        schedule = db.query(BusSchedule).options(
            joinedload(BusSchedule.bus).joinedload(Bus.operator),
            joinedload(BusSchedule.seats)
        ).filter(BusSchedule.id == schedule_id).first()
        
        if not schedule:
            return f"Bus schedule with ID {schedule_id} not found"
        
        available_seats = [s for s in schedule.seats if s.is_available]
        booked_seats = [s for s in schedule.seats if not s.is_available]
        
        seat_list = []
        for seat in available_seats:
            seat_list.append({
                "seat_id": seat.id,
                "seat_number": seat.seat_number,
                "price": seat.price,
                "deck": seat.deck,
                "side": seat.side,
                "is_window": seat.is_window,
                "is_ladies_only": seat.is_ladies_only
            })
        
        return json.dumps({
            "schedule_id": schedule_id,
            "operator": schedule.bus.operator.name,
            "bus_type": schedule.bus.bus_type,
            "total_seats": len(schedule.seats),
            "available": len(available_seats),
            "booked": len(booked_seats),
            "available_seats": seat_list[:20]
        }, indent=2)
    finally:
        db.close()


@tool
def get_boarding_dropping_points(schedule_id: int) -> str:
    """
    Get boarding and dropping points for a bus schedule.
    
    Args:
        schedule_id: The bus schedule ID
    
    Returns:
        List of boarding and dropping points with times
    """
    db = get_db_session()
    try:
        schedule = db.query(BusSchedule).options(
            joinedload(BusSchedule.boarding_points),
            joinedload(BusSchedule.dropping_points)
        ).filter(BusSchedule.id == schedule_id).first()
        
        if not schedule:
            return f"Bus schedule with ID {schedule_id} not found"
        
        boarding = [{"name": bp.name, "time": str(bp.time)[:5], "landmark": bp.landmark} 
                    for bp in schedule.boarding_points]
        dropping = [{"name": dp.name, "time": str(dp.time)[:5], "landmark": dp.landmark} 
                    for dp in schedule.dropping_points]
        
        return json.dumps({
            "schedule_id": schedule_id,
            "boarding_points": boarding,
            "dropping_points": dropping
        }, indent=2)
    finally:
        db.close()


@tool
def check_wallet_balance(user_id: int) -> str:
    """
    Check wallet balance for a user.
    
    Args:
        user_id: The user's ID
    
    Returns:
        Current wallet balance
    """
    db = get_db_session()
    try:
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        
        if not wallet:
            return json.dumps({"balance": 0, "message": "No wallet found"})
        
        return json.dumps({
            "balance": wallet.balance,
            "message": f"Current wallet balance: ₹{wallet.balance:.2f}"
        })
    finally:
        db.close()


@tool
def book_seats(
    user_id: int,
    schedule_id: int,
    seat_ids_json: str,
    passenger_names_json: str,
    passenger_ages_json: str,
    passenger_genders_json: str
) -> str:
    """
    Book seats on a bus and pay from wallet.
    
    Args:
        user_id: The user's ID
        schedule_id: The bus schedule ID
        seat_ids_json: JSON string of seat IDs to book, e.g. "[1, 2, 3]"
        passenger_names_json: JSON string of passenger names, e.g. '["John", "Jane"]'
        passenger_ages_json: JSON string of passenger ages, e.g. "[25, 30]"
        passenger_genders_json: JSON string of genders, e.g. '["male", "female"]'
    
    Returns:
        Booking confirmation with booking code or error message
    """
    db = get_db_session()
    try:
        # Parse JSON inputs
        seat_ids = json.loads(seat_ids_json)
        passenger_names = json.loads(passenger_names_json)
        passenger_ages = json.loads(passenger_ages_json)
        passenger_genders = json.loads(passenger_genders_json)
        
        # Validate inputs
        if len(seat_ids) != len(passenger_names) or len(seat_ids) != len(passenger_ages):
            return "Error: Number of seat_ids, passenger_names, and passenger_ages must match"
        
        # Get schedule
        schedule = db.query(BusSchedule).options(
            joinedload(BusSchedule.seats),
            joinedload(BusSchedule.bus).joinedload(Bus.operator),
            joinedload(BusSchedule.route).joinedload(Route.from_city),
            joinedload(BusSchedule.route).joinedload(Route.to_city)
        ).filter(BusSchedule.id == schedule_id).first()
        
        if not schedule:
            return f"Error: Bus schedule {schedule_id} not found"
        
        # Get seats and check availability
        seats_to_book = []
        total_amount = 0
        for seat_id in seat_ids:
            seat = db.query(Seat).filter(
                Seat.id == seat_id,
                Seat.bus_schedule_id == schedule_id
            ).first()
            
            if not seat:
                return f"Error: Seat ID {seat_id} not found for this schedule"
            if not seat.is_available:
                return f"Error: Seat {seat.seat_number} is no longer available"
            
            seats_to_book.append(seat)
            total_amount += seat.price
        
        # Check wallet balance
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        
        if not wallet:
            return "Error: Wallet not found. Please add money to wallet first."
        
        if wallet.balance < total_amount:
            return f"Error: Insufficient wallet balance. Required: ₹{total_amount:.2f}, Available: ₹{wallet.balance:.2f}"
        
        # Deduct from wallet
        wallet.balance -= total_amount
        
        # Create wallet transaction
        transaction = Transaction(
            wallet_id=wallet.id,
            type="debit",
            amount=total_amount,
            description=f"Bus booking: {schedule.route.from_city.name} to {schedule.route.to_city.name}"
        )
        db.add(transaction)
        
        # Generate booking code
        import random
        import string
        booking_code = "BK" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Create booking
        booking = Booking(
            user_id=user_id,
            bus_schedule_id=schedule_id,
            booking_code=booking_code,
            total_amount=total_amount,
            status="confirmed",
            payment_method="wallet",
            booking_source="agent"
        )
        db.add(booking)
        db.flush()
        
        # Create passengers and mark seats as booked
        passenger_details = []
        for i, seat in enumerate(seats_to_book):
            passenger = BookingPassenger(
                booking_id=booking.id,
                seat_id=seat.id,
                passenger_name=passenger_names[i],
                passenger_age=passenger_ages[i],
                passenger_gender=passenger_genders[i] if i < len(passenger_genders) else "male"
            )
            db.add(passenger)
            seat.is_available = False
            
            passenger_details.append({
                "name": passenger_names[i],
                "seat": seat.seat_number,
                "age": passenger_ages[i]
            })
        
        schedule.available_seats -= len(seats_to_book)
        
        db.commit()
        
        return json.dumps({
            "success": True,
            "booking_code": booking_code,
            "message": f"🎉 Booking confirmed! Your booking code is {booking_code}",
            "details": {
                "route": f"{schedule.route.from_city.name} → {schedule.route.to_city.name}",
                "date": str(schedule.travel_date),
                "departure": str(schedule.departure_time)[:5],
                "operator": schedule.bus.operator.name,
                "passengers": passenger_details,
                "total_paid": total_amount
            }
        }, indent=2)
        
    except Exception as e:
        db.rollback()
        return f"Error during booking: {str(e)}"
    finally:
        db.close()


@tool
def get_user_bookings(user_id: int) -> str:
    """
    Get user's booking history.
    
    Args:
        user_id: The user's ID
    
    Returns:
        List of user's bookings
    """
    db = get_db_session()
    try:
        bookings = db.query(Booking).options(
            joinedload(Booking.bus_schedule).joinedload(BusSchedule.bus).joinedload(Bus.operator),
            joinedload(Booking.bus_schedule).joinedload(BusSchedule.route).joinedload(Route.from_city),
            joinedload(Booking.bus_schedule).joinedload(BusSchedule.route).joinedload(Route.to_city),
            joinedload(Booking.passengers)
        ).filter(
            Booking.user_id == user_id
        ).order_by(Booking.booked_at.desc()).limit(10).all()
        
        if not bookings:
            return "No bookings found for this user"
        
        result = []
        for b in bookings:
            result.append({
                "booking_code": b.booking_code,
                "status": b.status,
                "route": f"{b.bus_schedule.route.from_city.name} → {b.bus_schedule.route.to_city.name}",
                "date": str(b.bus_schedule.travel_date),
                "departure": str(b.bus_schedule.departure_time)[:5],
                "operator": b.bus_schedule.bus.operator.name,
                "passengers": len(b.passengers),
                "total_amount": b.total_amount
            })
        
        return json.dumps({"bookings": result}, indent=2)
    finally:
        db.close()


# List of all tools
booking_tools = [
    search_cities,
    get_popular_cities,
    search_buses,
    get_seat_availability,
    get_boarding_dropping_points,
    check_wallet_balance,
    book_seats,
    get_user_bookings
]
