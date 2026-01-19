import { create } from 'zustand';
import axios from 'axios';

// 🔹 백엔드 API 서비스 정의 (기존 코드의 chatService 역할)
const chatService = {
  sendMessage: async (message: string): Promise<string> => {
    try {
      // main.py에서 설정한 라우터 경로에 맞춰 호출
      const response = await axios.post('http://localhost:8000/api/chatbot/ask', {
        query: message,
      });

      // 백엔드 ChatbotEngine의 answer 함수가 반환하는 JSON 구조 반영
      // { "answer": "챗봇 답변 내용..." }
      return response.data.answer;
    } catch (error: any) {
      console.error("챗봇 API 에러:", error);
      return "죄송합니다. 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
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