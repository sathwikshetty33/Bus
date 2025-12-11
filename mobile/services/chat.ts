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
  },

  /**
   * Transcribe audio to text using Groq Whisper
   */
  transcribeAudio: async (audioUri: string): Promise<{ text: string; language?: string }> => {
    const formData = new FormData();
    
    // Get file info from URI
    const filename = audioUri.split('/').pop() || 'audio.m4a';
    
    // Append file to form data
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    } as any);
    
    const response = await api.post('/agent/transcribe-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for transcription
    });
    
    return response.data;
  }
};
