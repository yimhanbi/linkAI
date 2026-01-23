import axios from 'axios';
import { API_BASE_URL } from '@/Service/apiBaseUrl';

// Must be >= backend OPENAI_CHAT_TIMEOUT_SECONDS to avoid client-side aborts.
const CHAT_REQUEST_TIMEOUT_MS: number = 300_000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: CHAT_REQUEST_TIMEOUT_MS,
});

export const chatService = {
  /**
   * 1. AI에게 질문 보내기
   * @param message 사용자 질문
   * @param sessionId 기존 대화 세션 ID (새 대화면 null)
   */
  async sendMessage(message: string, sessionId?: string | null): Promise<{ answer: string; session_id: string }> {
    try {
      const response = await apiClient.post(`/api/chatbot/ask`, {
        query: message,
        session_id: sessionId,
      });
      
      // 백엔드 ChatbotEngine.answer가 반환하는 { answer, session_id } 형태를 그대로 리턴
      return response.data;
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Chat API Error:", error);
      if (axios.isAxiosError(error)) {
        const status: number | undefined = error.response?.status;
        const data: unknown = error.response?.data;
        const detail: string =
          typeof data === "object" && data !== null && "detail" in data
            ? String((data as Record<string, unknown>).detail)
            : error.message;
        if (status) {
          throw new Error(`챗봇 서버 오류 (${status}): ${detail}`);
        }
        throw new Error(`챗봇 서버 연결 실패: ${detail}`);
      }
      throw new Error("챗봇 요청 중 알 수 없는 오류가 발생했습니다.");
    }
  },

  /**
   * 2. 사이드바용 모든 세션 목록 가져오기
   */
  async getSessions(): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/chatbot/sessions`);
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
      const response = await apiClient.get(`/api/chatbot/sessions/${sessionId}`);
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
  ,
  /**
   * 4. 특정 세션 삭제
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/chatbot/sessions/${sessionId}`);
      const data: unknown = response.data;
      if (typeof data === "object" && data !== null && "deleted" in data) {
        return Boolean((data as { deleted?: unknown }).deleted);
      }
      return true;
    } catch (error) {
      console.error("Delete Session Error:", error);
      return false;
    }
  }
};