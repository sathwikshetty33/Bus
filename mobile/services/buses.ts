import api from './api';
import { City, BusSchedule, BusSearchParams, Seat } from '../types';

export const busService = {
  // Get list of cities
  getCities: async (search?: string, popularOnly?: boolean): Promise<City[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (popularOnly) params.popular_only = true;
    
    const response = await api.get<City[]>('/buses/cities', { params });
    return response.data;
  },

  // Search for buses
  searchBuses: async (params: BusSearchParams): Promise<BusSchedule[]> => {
    const response = await api.post<BusSchedule[]>('/buses/search', params);
    return response.data;
  },

  // Get bus schedule details with seats
  getBusDetails: async (scheduleId: number): Promise<BusSchedule> => {
    const response = await api.get<BusSchedule>(`/buses/${scheduleId}`);
    return response.data;
  },

  // Get seats for a bus schedule
  getSeats: async (scheduleId: number): Promise<Seat[]> => {
    const response = await api.get<Seat[]>(`/buses/${scheduleId}/seats`);
    return response.data;
  },
};
