from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, Time, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Operator(Base):
    """Bus operator/company model."""
    
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    rating = Column(Float, default=4.0)
    total_buses = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    buses = relationship("Bus", back_populates="operator", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Operator {self.name}>"


class City(Base):
    """City model for route endpoints."""
    
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    is_popular = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    routes_from = relationship("Route", foreign_keys="Route.from_city_id", back_populates="from_city")
    routes_to = relationship("Route", foreign_keys="Route.to_city_id", back_populates="to_city")

    def __repr__(self):
        return f"<City {self.name}>"


class Route(Base):
    """Route model connecting two cities."""
    
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    from_city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    to_city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    distance_km = Column(Integer, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    from_city = relationship("City", foreign_keys=[from_city_id], back_populates="routes_from")
    to_city = relationship("City", foreign_keys=[to_city_id], back_populates="routes_to")
    bus_schedules = relationship("BusSchedule", back_populates="route")

    def __repr__(self):
        return f"<Route {self.from_city_id} -> {self.to_city_id}>"


class Bus(Base):
    """Bus model representing a physical bus."""
    
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    bus_number = Column(String(20), nullable=False)
    bus_type = Column(String(30), nullable=False)  # sleeper, semi-sleeper, seater, ac-sleeper
    total_seats = Column(Integer, nullable=False)
    seat_layout = Column(String(10), nullable=False)  # 2+1, 2+2, 1+1+1
    amenities = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    operator = relationship("Operator", back_populates="buses")
    schedules = relationship("BusSchedule", back_populates="bus", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Bus {self.bus_number}>"


class BusSchedule(Base):
    """Bus schedule for a specific date and route."""
    
    __tablename__ = "bus_schedules"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    travel_date = Column(Date, nullable=False)
    departure_time = Column(Time, nullable=False)
    arrival_time = Column(Time, nullable=False)
    base_price = Column(Float, nullable=False)
    available_seats = Column(Integer, nullable=False)
    status = Column(String(20), default="scheduled")  # scheduled, departed, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    bus = relationship("Bus", back_populates="schedules")
    route = relationship("Route", back_populates="bus_schedules")
    seats = relationship("Seat", back_populates="bus_schedule", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="bus_schedule")

    def __repr__(self):
        return f"<BusSchedule bus_id={self.bus_id} date={self.travel_date}>"


class Seat(Base):
    """Individual seat in a bus schedule."""
    
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    bus_schedule_id = Column(Integer, ForeignKey("bus_schedules.id", ondelete="CASCADE"), nullable=False)
    seat_number = Column(String(5), nullable=False)
    seat_type = Column(String(20), nullable=False)  # lower, upper, window, aisle, single
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)
    is_ladies_only = Column(Boolean, default=False)
    row_number = Column(Integer, nullable=False)
    column_number = Column(Integer, nullable=False)
    deck = Column(String(10), default="lower")  # lower, upper

    # Relationships
    bus_schedule = relationship("BusSchedule", back_populates="seats")
    booking_passenger = relationship("BookingPassenger", back_populates="seat", uselist=False)

    def __repr__(self):
        return f"<Seat {self.seat_number}>"
