// TypeScript types for the bus booking app

export interface User {
  id: number;
  email: string;
  phone: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface City {
  id: number;
  name: string;
  state: string;
  code: string;
  is_popular: boolean;
}

export interface Operator {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
  rating: number;
}

export interface Route {
  id: number;
  from_city: City;
  to_city: City;
  distance_km: number;
  duration_minutes: number;
}

export interface Bus {
  id: number;
  bus_number: string;
  bus_type: string;
  total_seats: number;
  seat_layout: string;
  amenities: string[];
  operator: Operator;
}

export interface Seat {
  id: number;
  seat_number: string;
  seat_type: string;
  price: number;
  is_available: boolean;
  is_ladies_only: boolean;
  row_number: number;
  column_number: number;
  deck: string;
}

export interface BusSchedule {
  id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  available_seats: number;
  status: string;
  bus: Bus;
  route: Route;
  seats?: Seat[];
}

export interface Passenger {
  seat_id: number;
  passenger_name: string;
  passenger_age: number;
  passenger_gender: 'male' | 'female' | 'other';
}

export interface BookingPassenger {
  id: number;
  seat_id: number;
  seat_number: string;
  passenger_name: string;
  passenger_age: number;
  passenger_gender: string;
}

export interface Booking {
  id: number;
  booking_code: string;
  total_amount: number;
  status: string;
  payment_method: string;
  booking_source: string;
  booked_at: string;
  cancelled_at: string | null;
  bus_schedule_id: number;
  bus_number?: string;
  bus_type?: string;
  operator_name?: string;
  from_city?: string;
  to_city?: string;
  travel_date?: string;
  departure_time?: string;
  arrival_time?: string;
  passengers: BookingPassenger[];
}

export interface Wallet {
  id: number;
  balance: number;
  updated_at: string;
}

export interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: number | null;
  created_at: string;
}

export interface BusSearchParams {
  from_city: string;
  to_city: string;
  travel_date: string;
}

export interface BookingCreateParams {
  bus_schedule_id: number;
  passengers: Passenger[];
  payment_method: 'wallet' | 'card' | 'upi';
}
