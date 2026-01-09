import { create } from 'zustand';
import { chatService } from '@/Service/chatbot/chatService';

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
    return await chatService.sendMessage(message);
  },
}));