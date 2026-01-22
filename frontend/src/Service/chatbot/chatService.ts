import axios from 'axios';

// 백엔드 API 기본 주소 (설정에 맞게 수정하세요)
const API_BASE_URL = '/api/chatbot'; 

export const chatService = {
  /**
   * 1. AI에게 질문 보내기
   * @param message 사용자 질문
   * @param sessionId 기존 대화 세션 ID (새 대화면 null)
   */
  async sendMessage(message: string, sessionId?: string | null): Promise<{ answer: string; session_id: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/answer`, {
        query: message,
        session_id: sessionId
      });
      
      // 백엔드 ChatbotEngine.answer가 반환하는 { answer, session_id } 형태를 그대로 리턴
      return response.data;
    } catch (error: any) {
      console.error("Chat API Error:", error);
      throw new Error(error.response?.data?.detail || "엔진 연결에 실패했습니다.");
    }
  },

  /**
   * 2. 사이드바용 모든 세션 목록 가져오기
   */
  async getSessions(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/sessions`);
      const data: unknown = response.data;
      if (Array.isArray(data)) return data;
      if (typeof data === "object" && data !== null && "sessions" in data) {
        const sessions = (data as { sessions?: unknown }).sessions;
        if (Array.isArray(sessions)) return sessions;
      }
      return [];
    } catch (error) {
      console.error("Get Sessions Error:", error);
      return [];
    }
  },

  /**
   * 3. 특정 세션의 과거 대화 내역 가져오기
   */
  async getChatHistory(sessionId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`);
      const data: unknown = response.data;
      if (Array.isArray(data)) return data;
      if (typeof data === "object" && data !== null && "messages" in data) {
        const messages = (data as { messages?: unknown }).messages;
        if (Array.isArray(messages)) return messages;
      }
      return [];
    } catch (error) {
      console.error("Get History Error:", error);
      return [];
    }
  }
};