"""
Seed script to populate database with mock bus data.
Run with: python -m app.seed_data
"""

from datetime import date, time, timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal, init_db
from .models.bus import Operator, City, Route, Bus, BusSchedule, Seat


def create_operators(db: Session):
    """Create bus operators."""
    operators = [
        {"name": "VRL Travels", "code": "VRL", "rating": 4.5, "logo_url": None},
        {"name": "SRS Travels", "code": "SRS", "rating": 4.3, "logo_url": None},
        {"name": "KSRTC", "code": "KSRTC", "rating": 4.0, "logo_url": None},
        {"name": "Orange Travels", "code": "ORANGE", "rating": 4.2, "logo_url": None},
        {"name": "Sugama Travels", "code": "SUGAMA", "rating": 4.4, "logo_url": None},
        {"name": "Neeta Travels", "code": "NEETA", "rating": 4.1, "logo_url": None},
        {"name": "Paulo Travels", "code": "PAULO", "rating": 4.3, "logo_url": None},
        {"name": "Kallada Travels", "code": "KALLADA", "rating": 4.2, "logo_url": None},
        {"name": "APSRTC", "code": "APSRTC", "rating": 3.9, "logo_url": None},
        {"name": "TSRTC", "code": "TSRTC", "rating": 3.8, "logo_url": None},
    ]
    
    created = []
    for op_data in operators:
        existing = db.query(Operator).filter(Operator.code == op_data["code"]).first()
        if not existing:
            op = Operator(**op_data)
            db.add(op)
            created.append(op)
    
    db.commit()
    print(f"✅ Created {len(created)} operators")
    return db.query(Operator).all()


def create_cities(db: Session):
    """Create cities."""
    cities = [
        {"name": "Bengaluru", "state": "Karnataka", "code": "BLR", "is_popular": True},
        {"name": "Mumbai", "state": "Maharashtra", "code": "MUM", "is_popular": True},
        {"name": "Chennai", "state": "Tamil Nadu", "code": "CHN", "is_popular": True},
        {"name": "Hyderabad", "state": "Telangana", "code": "HYD", "is_popular": True},
        {"name": "Pune", "state": "Maharashtra", "code": "PNQ", "is_popular": True},
        {"name": "Goa", "state": "Goa", "code": "GOA", "is_popular": True},
        {"name": "Mysuru", "state": "Karnataka", "code": "MYS", "is_popular": True},
        {"name": "Mangaluru", "state": "Karnataka", "code": "MNG", "is_popular": False},
        {"name": "Hubli", "state": "Karnataka", "code": "HBL", "is_popular": False},
        {"name": "Vijayawada", "state": "Andhra Pradesh", "code": "VJA", "is_popular": False},
        {"name": "Visakhapatnam", "state": "Andhra Pradesh", "code": "VZG", "is_popular": False},
        {"name": "Coimbatore", "state": "Tamil Nadu", "code": "CJB", "is_popular": False},
        {"name": "Madurai", "state": "Tamil Nadu", "code": "MDU", "is_popular": False},
        {"name": "Tirupati", "state": "Andhra Pradesh", "code": "TRP", "is_popular": True},
        {"name": "Kochi", "state": "Kerala", "code": "KCH", "is_popular": True},
        {"name": "Trivandrum", "state": "Kerala", "code": "TRV", "is_popular": False},
        {"name": "Nagpur", "state": "Maharashtra", "code": "NAG", "is_popular": False},
        {"name": "Ahmedabad", "state": "Gujarat", "code": "AMD", "is_popular": True},
        {"name": "Delhi", "state": "Delhi", "code": "DEL", "is_popular": True},
        {"name": "Jaipur", "state": "Rajasthan", "code": "JAI", "is_popular": True},
    ]
    
    created = []
    for city_data in cities:
        existing = db.query(City).filter(City.code == city_data["code"]).first()
        if not existing:
            city = City(**city_data)
            db.add(city)
            created.append(city)
    
    db.commit()
    print(f"✅ Created {len(created)} cities")
    return db.query(City).all()


def create_routes(db: Session, cities: list):
    """Create routes between cities."""
    city_map = {c.code: c for c in cities}
    
    route_data = [
        # Bangalore routes
        ("BLR", "CHN", 350, 360),
        ("BLR", "HYD", 570, 480),
        ("BLR", "MUM", 980, 840),
        ("BLR", "PNQ", 840, 720),
        ("BLR", "GOA", 560, 540),
        ("BLR", "MYS", 150, 180),
        ("BLR", "MNG", 350, 420),
        ("BLR", "KCH", 550, 600),
        ("BLR", "TRP", 250, 300),
        # Chennai routes
        ("CHN", "BLR", 350, 360),
        ("CHN", "HYD", 630, 540),
        ("CHN", "MUM", 1330, 1080),
        ("CHN", "CJB", 500, 480),
        ("CHN", "MDU", 460, 420),
        ("CHN", "TRP", 135, 180),
        # Hyderabad routes
        ("HYD", "BLR", 570, 480),
        ("HYD", "CHN", 630, 540),
        ("HYD", "MUM", 710, 600),
        ("HYD", "VJA", 275, 300),
        ("HYD", "VZG", 610, 540),
        # Mumbai routes
        ("MUM", "BLR", 980, 840),
        ("MUM", "PNQ", 150, 180),
        ("MUM", "GOA", 590, 540),
        ("MUM", "HYD", 710, 600),
        ("MUM", "AMD", 530, 480),
        # Other routes
        ("PNQ", "BLR", 840, 720),
        ("PNQ", "GOA", 450, 420),
        ("GOA", "BLR", 560, 540),
        ("DEL", "JAI", 280, 300),
        ("AMD", "MUM", 530, 480),
    ]
    
    created = []
    for from_code, to_code, distance, duration in route_data:
        from_city = city_map.get(from_code)
        to_city = city_map.get(to_code)
        
        if from_city and to_city:
            existing = db.query(Route).filter(
                Route.from_city_id == from_city.id,
                Route.to_city_id == to_city.id
            ).first()
            
            if not existing:
                route = Route(
                    from_city_id=from_city.id,
                    to_city_id=to_city.id,
                    distance_km=distance,
                    duration_minutes=duration
                )
                db.add(route)
                created.append(route)
    
    db.commit()
    print(f"✅ Created {len(created)} routes")
    return db.query(Route).all()


def create_buses(db: Session, operators: list):
    """Create buses for operators."""
    bus_types = [
        ("sleeper", "2+1", 30, ["wifi", "charging", "blanket", "water"]),
        ("semi-sleeper", "2+2", 40, ["charging", "water"]),
        ("ac-sleeper", "2+1", 30, ["wifi", "charging", "blanket", "water", "snacks"]),
        ("seater", "2+2", 45, ["water"]),
        ("volvo-ac", "2+2", 40, ["wifi", "charging", "water", "entertainment"]),
    ]
    
    created = []
    bus_counter = 1
    
    for operator in operators:
        for bus_type, layout, seats, amenities in bus_types[:3]:  # 3 buses per operator
            bus_number = f"KA-{operator.code[:2]}-{bus_counter:04d}"
            
            existing = db.query(Bus).filter(Bus.bus_number == bus_number).first()
            if not existing:
                bus = Bus(
                    operator_id=operator.id,
                    bus_number=bus_number,
                    bus_type=bus_type,
                    total_seats=seats,
                    seat_layout=layout,
                    amenities=amenities
                )
                db.add(bus)
                created.append(bus)
            
            bus_counter += 1
    
    db.commit()
    print(f"✅ Created {len(created)} buses")
    return db.query(Bus).all()


def create_schedules(db: Session, buses: list, routes: list):
    """Create bus schedules for the next 7 days."""
    departure_times = [
        time(6, 0), time(8, 30), time(10, 0), time(14, 0),
        time(18, 0), time(20, 30), time(22, 0), time(23, 30)
    ]
    
    base_prices = {
        "sleeper": 800,
        "semi-sleeper": 600,
        "ac-sleeper": 1200,
        "seater": 400,
        "volvo-ac": 1000,
    }
    
    today = date.today()
    created_schedules = []
    
    for day_offset in range(7):  # Next 7 days
        travel_date = today + timedelta(days=day_offset)
        
        for i, bus in enumerate(buses[:30]):  # Limit to 30 buses for reasonable data
            route = routes[i % len(routes)]
            dep_time = departure_times[i % len(departure_times)]
            
            # Calculate arrival time
            duration_hours = route.duration_minutes // 60
            arrival_hour = (dep_time.hour + duration_hours) % 24
            arr_time = time(arrival_hour, dep_time.minute)
            
            base_price = base_prices.get(bus.bus_type, 500)
            # Add weekend surge
            if travel_date.weekday() >= 5:
                base_price = int(base_price * 1.2)
            
            existing = db.query(BusSchedule).filter(
                BusSchedule.bus_id == bus.id,
                BusSchedule.travel_date == travel_date
            ).first()
            
            if not existing:
                schedule = BusSchedule(
                    bus_id=bus.id,
                    route_id=route.id,
                    travel_date=travel_date,
                    departure_time=dep_time,
                    arrival_time=arr_time,
                    base_price=base_price,
                    available_seats=bus.total_seats,
                    status="scheduled"
                )
                db.add(schedule)
                db.flush()
                
                # Create seats for this schedule
                create_seats(db, schedule, bus)
                created_schedules.append(schedule)
    
    db.commit()
    print(f"✅ Created {len(created_schedules)} bus schedules")


def create_seats(db: Session, schedule: BusSchedule, bus: Bus):
    """Create seats for a bus schedule."""
    layout = bus.seat_layout  # e.g., "2+1" or "2+2"
    cols = sum(int(x) for x in layout.split("+"))
    total_seats = bus.total_seats
    rows = total_seats // cols
    
    is_sleeper = "sleeper" in bus.bus_type.lower()
    
    seat_counter = 1
    for deck in (["lower", "upper"] if is_sleeper else ["lower"]):
        deck_rows = rows // 2 if is_sleeper else rows
        
        for row in range(1, deck_rows + 1):
            for col in range(1, cols + 1):
                if seat_counter > total_seats:
                    break
                
                # Determine seat type
                if is_sleeper:
                    seat_type = "lower" if deck == "lower" else "upper"
                elif col == 1 or col == cols:
                    seat_type = "window"
                else:
                    seat_type = "aisle"
                
                # Create seat number like L1, L2, U1, U2 for sleeper
                # Or A1, A2, B1, B2 for seater
                if is_sleeper:
                    prefix = "L" if deck == "lower" else "U"
                else:
                    prefix = chr(64 + row)  # A, B, C, etc.
                
                seat_number = f"{prefix}{seat_counter % 100}"
                
                # Price variation
                price = schedule.base_price
                if seat_type == "window":
                    price *= 1.1
                if deck == "lower":
                    price *= 1.15
                
                seat = Seat(
                    bus_schedule_id=schedule.id,
                    seat_number=seat_number,
                    seat_type=seat_type,
                    price=round(price, 2),
                    is_available=True,
                    is_ladies_only=(row == deck_rows and col <= 2),  # Last row first 2 seats
                    row_number=row,
                    column_number=col,
                    deck=deck
                )
                db.add(seat)
                seat_counter += 1


def seed_database():
    """Main function to seed the database."""
    print("🚀 Starting database seed...")
    
    # Initialize database tables
    init_db()
    
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Operator).count() > 0:
            print("⚠️  Database already seeded. Skipping...")
            return
        
        operators = create_operators(db)
        cities = create_cities(db)
        routes = create_routes(db, cities)
        buses = create_buses(db, operators)
        create_schedules(db, buses, routes)
        
        print("✅ Database seeding complete!")
        
        # Print summary
        print(f"\n📊 Database Summary:")
        print(f"   Operators: {db.query(Operator).count()}")
        print(f"   Cities: {db.query(City).count()}")
        print(f"   Routes: {db.query(Route).count()}")
        print(f"   Buses: {db.query(Bus).count()}")
        print(f"   Schedules: {db.query(BusSchedule).count()}")
        print(f"   Seats: {db.query(Seat).count()}")
        
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
