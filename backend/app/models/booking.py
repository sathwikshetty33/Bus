from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Booking(Base):
    """Booking model for user ticket reservations."""
    
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(10), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bus_schedule_id = Column(Integer, ForeignKey("bus_schedules.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(20), default="confirmed")  # pending, confirmed, cancelled, completed
    payment_method = Column(String(20), nullable=False)  # wallet, card, upi
    booking_source = Column(String(20), default="app")  # app, agent
    booked_at = Column(DateTime(timezone=True), server_default=func.now())
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="bookings")
    bus_schedule = relationship("BusSchedule", back_populates="bookings")
    passengers = relationship("BookingPassenger", back_populates="booking", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Booking {self.booking_code}>"


class BookingPassenger(Base):
    """Passenger details for each booking."""
    
    __tablename__ = "booking_passengers"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=False)
    passenger_name = Column(String(100), nullable=False)
    passenger_age = Column(Integer, nullable=False)
    passenger_gender = Column(String(10), nullable=False)  # male, female, other

    # Relationships
    booking = relationship("Booking", back_populates="passengers")
    seat = relationship("Seat", back_populates="booking_passenger")

    def __repr__(self):
        return f"<BookingPassenger {self.passenger_name}>"
