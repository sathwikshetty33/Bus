import api, { setTokens, clearTokens } from './api';
import { AuthTokens, User } from '../types';

interface RegisterParams {
  email: string;
  phone: string;
  password: string;
  full_name: string;
}

interface LoginParams {
  email: string;
  password: string;
}

export const authService = {
  // Register a new user
  register: async (params: RegisterParams): Promise<AuthTokens> => {
    const response = await api.post<AuthTokens>('/auth/register', params);
    await setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  },

  // Login user
  login: async (params: LoginParams): Promise<AuthTokens> => {
    const formData = new URLSearchParams();
    formData.append('username', params.email);
    formData.append('password', params.password);
    
    const response = await api.post<AuthTokens>('/auth/login', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    await setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  },

  // Get current user
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await clearTokens();
  },
};
