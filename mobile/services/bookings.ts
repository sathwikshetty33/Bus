import api from './api';
import { Booking, BookingCreateParams, BookingDetail } from '../types';

interface BookingListResponse {
  bookings: Booking[];
  total: number;
}

export const bookingService = {
  // Create a new booking
  createBooking: async (params: BookingCreateParams): Promise<Booking> => {
    const response = await api.post<Booking>('/bookings', params);
    return response.data;
  },

  // Get all bookings for current user
  getBookings: async (): Promise<BookingListResponse> => {
    const response = await api.get<BookingListResponse>('/bookings');
    return response.data;
  },

  // Get booking details
  getBooking: async (bookingId: number): Promise<Booking> => {
    const response = await api.get<Booking>(`/bookings/${bookingId}`);
    return response.data;
  },

  // Cancel a booking
  cancelBooking: async (bookingId: number): Promise<Booking> => {
    const response = await api.post<Booking>(`/bookings/${bookingId}/cancel`);
    return response.data;
  },

  // Get detailed booking with tracking info (boarding/dropping points)
  getBookingDetails: async (bookingId: number): Promise<BookingDetail> => {
    const response = await api.get<BookingDetail>(`/bookings/${bookingId}/details`);
    return response.data;
  },
};
