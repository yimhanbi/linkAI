import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '@/Service/apiBaseUrl';

// 🔹 백엔드 API 서비스 정의 (기존 코드의 chatService 역할)
const chatService = {
  sendMessage: async (message: string): Promise<string> => {
    try {
      // main.py에서 설정한 라우터 경로에 맞춰 호출
      const response = await axios.post(`${API_BASE_URL}/api/chatbot/ask`, {
        query: message,
      });

      // 백엔드 ChatbotEngine의 answer 함수가 반환하는 JSON 구조 반영
      // { "answer": "챗봇 답변 내용..." }
      return response.data.answer;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status: number | undefined = err.response?.status;
        const data: unknown = err.response?.data;
        const url: string | undefined = err.config?.url;
        console.error("챗봇 API 에러(axios)", {
          message: err.message,
          code: err.code,
          status,
          url,
          data,
        });
        if (status) {
          const detail: string =
            typeof data === "object" && data !== null && "detail" in data
              ? String((data as Record<string, unknown>).detail)
              : "서버 오류";
          return `챗봇 서버 오류 (${status}): ${detail}`;
        }
        return "챗봇 서버에 연결할 수 없습니다. 백엔드(8000)가 실행 중인지 확인해주세요.";
      }
      console.error("챗봇 API 에러(unknown):", err);
      return "챗봇 요청 중 알 수 없는 오류가 발생했습니다.";
    }
  }
};

interface ChatbotState {
  isOpen: boolean;
  toggleChatbot: () => void;
  openChatbot: () => void;
  closeChatbot: () => void;
  getBotResponse: (message: string) => Promise<string>;
}

export const useChatbotStore = create<ChatbotState>((set) => ({
  isOpen: false,
  toggleChatbot: () => set((state) => ({ isOpen: !state.isOpen })),
  openChatbot: () => set({ isOpen: true }),
  closeChatbot: () => set({ isOpen: false }),
  getBotResponse: async (message: string) => {
    // 🔹 기존 로직대로 chatService를 호출합니다.
    return await chatService.sendMessage(message);
  },
}));