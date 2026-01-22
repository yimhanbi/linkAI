import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './Chatbot.css';

import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import ChatSidebar from './ChatSidebar';
import { useChatbotStore } from '@/ViewModel/useChatbotVM';
import { type Message, useChatViewModel } from '@/ViewModel/chatbot/ChatViewModel';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ChatbotContainer = () => {
  const location = useLocation();
  const { isOpen, openChatbot, closeChatbot } = useChatbotStore();


  //viewModel 사용
  const { messages, sessions, currentSessionId, selectSession, createNewChat } = useChatViewModel();

  useEffect(() => {
    if (location.pathname === '/chatbot') {
      openChatbot();
      return;
    }
    closeChatbot();
  }, [location.pathname, openChatbot, closeChatbot]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="chatbot-wrapper flex h-screen w-full">
      {/* 왼쪽: 사이드바 */}
      <ChatSidebar 
        sessions={sessions || []}
        currentId={currentSessionId}
        onSelect={selectSession}
        onNewChat={createNewChat}
      />

      {/* 오른쪽: 채팅창 영역 */}
      <div className="chatbot-window flex-1">
        <Chatbot
          // [핵심] key를 설정해야 세션 전환 및 '새 채팅' 클릭 시 UI가 초기화됩니다.
          key={currentSessionId || 'new-session'}
          config={{
            ...config,
            // 과거 내역이 있다면 라이브러리 형식에 맞춰 주입합니다.
            initialMessages: messages.length > 0 
              ? messages.map((m: Message, idx: number) => ({
                  id: idx,
                  message: m.content,
                  type: m.role === 'assistant' ? 'bot' : 'user'
                }))
              : config.initialMessages
          }}
          messageParser={MessageParser}
          actionProvider={ActionProvider}
        />
      </div>
    </div>
  );
};

export default ChatbotContainer;