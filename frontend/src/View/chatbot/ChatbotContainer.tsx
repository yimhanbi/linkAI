import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './Chatbot.css';

import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import ChatSidebar from './ChatSidebar';
import ChatWelcome from './ChatWelcome';
import { useChatbotStore } from '@/ViewModel/useChatbotVM';
import { type Message, useChatViewModel } from '@/ViewModel/chatbot/ChatViewModel';
import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ChatbotContainer = () => {
  const location = useLocation();
  const { isOpen, openChatbot, closeChatbot } = useChatbotStore();


  //viewModel 사용
  const { messages, sessions, currentSessionId, currentSessionKey, selectSession, createNewChat, deleteSession, sendMessage } = useChatViewModel();

  // Fallback wiring for ActionProvider across react-chatbot-kit versions.
  // Use layout effect so it's available before the user submits the first message.
  useLayoutEffect(() => {
    (window as unknown as { __LINKAI_GET_BOT_RESPONSE?: unknown }).__LINKAI_GET_BOT_RESPONSE = sendMessage;
    return () => {
      (window as unknown as { __LINKAI_GET_BOT_RESPONSE?: unknown }).__LINKAI_GET_BOT_RESPONSE = undefined;
    };
  }, [sendMessage]);

  // Extra safety: keep it assigned during render as well.
  (window as unknown as { __LINKAI_GET_BOT_RESPONSE?: unknown }).__LINKAI_GET_BOT_RESPONSE = sendMessage;

  useEffect(() => {
    if (location.pathname === '/chatbot') {
      openChatbot();
      return;
    }
    closeChatbot();
  }, [location.pathname, openChatbot, closeChatbot]);

  useEffect(() => {
    if (!isOpen) return;
    // react-chatbot-kit default placeholder: "Write your message here"
    // Override to a localized prompt.
    const placeholder: string = "무엇이든 물어보세요";
    const timerId: number = window.setTimeout(() => {
      const inputEl: HTMLInputElement | null = document.querySelector(
        ".react-chatbot-kit-chat-input"
      );
      if (!inputEl) return;
      inputEl.setAttribute("placeholder", placeholder);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [isOpen, currentSessionKey]);

  const handlePickTemplate = (template: string): void => {
    const inputEl: HTMLInputElement | null = document.querySelector(".react-chatbot-kit-chat-input");
    if (!inputEl) return;
    inputEl.focus();
    inputEl.value = template;
    // Trigger React/onChange listeners inside the chatbot kit if present
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Show welcome only for "new chat" (no active session)
  const shouldShowWelcome: boolean = messages.length === 0 && !currentSessionId;

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
        onDelete={deleteSession}
      />

      {/* 오른쪽: 채팅창 영역 */}
      <div className="chatbot-window flex-1">
        {shouldShowWelcome ? <ChatWelcome onPickTemplate={handlePickTemplate} /> : null}
        <Chatbot
          // [핵심] key를 설정해야 세션 전환 및 '새 채팅' 클릭 시 UI가 초기화됩니다.
          key={currentSessionKey}
          config={{
            ...config,
            state: {
              ...(config.state ?? {}),
              // Make react-chatbot-kit send messages via session-aware ViewModel
              getBotResponse: sendMessage,
            },
            // 과거 내역이 있다면 라이브러리 형식에 맞춰 주입합니다.
            initialMessages: messages.length > 0 
              ? messages.map((m: Message, idx: number) => ({
                  id: idx,
                  message: m.content,
                  type: m.role === 'assistant' ? 'bot' : 'user'
                }))
              : []
          }}
          messageParser={MessageParser}
          actionProvider={ActionProvider}
        />
      </div>
    </div>
  );
};

export default ChatbotContainer;