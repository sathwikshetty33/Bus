import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  session_id: string;
  is_active: boolean;
  created_at: string;
  ended_at?: string;
}

export const chatService = {
  /**
   * Send a message to the AI agent
   */
  sendMessage: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await api.post('/agent/chat', {
      message,
      session_id: sessionId
    });
    return response.data;
  },

  /**
   * Get chat sessions
   */
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get('/agent/sessions');
    return response.data;
  },

  /**
   * Get chat history for a session
   */
  getHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/agent/sessions/${sessionId}/history`);
    return response.data;
  },

  /**
   * End a chat session
   */
  endSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/agent/sessions/${sessionId}`);
  }
};
