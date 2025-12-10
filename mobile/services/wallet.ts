import api from './api';
import { Wallet, Transaction } from '../types';

interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

export const walletService = {
  // Get wallet balance
  getWallet: async (): Promise<Wallet> => {
    const response = await api.get<Wallet>('/wallet');
    return response.data;
  },

  // Add money to wallet
  addMoney: async (amount: number): Promise<Wallet> => {
    const response = await api.post<Wallet>('/wallet/add', { amount });
    return response.data;
  },

  // Get transaction history
  getTransactions: async (limit = 20, offset = 0): Promise<TransactionListResponse> => {
    const response = await api.get<TransactionListResponse>('/wallet/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },
};
