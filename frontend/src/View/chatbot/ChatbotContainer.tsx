import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './Chatbot.css';

import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import ChatSidebar from './ChatSidebar';
import ChatWelcome from './ChatWelcome';
import PatentModalProvider from './patent_modal_context';
import { useChatbotStore } from '@/ViewModel/useChatbotVM';
import { type Message, useChatViewModel } from '@/ViewModel/chatbot/ChatViewModel';
import { useEffect, useLayoutEffect, useRef } from 'react';
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


  //---------스크롤 제어 로직 추가
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef<number | null>(null);
  const lockIntervalRef = useRef<number | null>(null);

  // 1) 사용자 스크롤 방향 감지 (위로 올리면 자동 스크롤 잠금)
  useEffect(() => {
    if (!isOpen) return;

    const messageContainer = document.querySelector<HTMLDivElement>(
      ".react-chatbot-kit-chat-message-container"
    );
    if (!messageContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messageContainer;
      const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 50;
      // 항상 마지막 스크롤 위치 저장
      lastScrollTopRef.current = scrollTop;
      // 바닥 기준으로만 자동 스크롤 on/off 결정
      isUserScrollingRef.current = !isAtBottom;

      // 사용자가 위로 올리기 시작하면, 라이브러리의 자동 스크롤을 계속 되돌리는 잠금 루프 시작
      if (isUserScrollingRef.current && lockIntervalRef.current === null) {
        lockIntervalRef.current = window.setInterval(() => {
          const container = document.querySelector<HTMLDivElement>(
            ".react-chatbot-kit-chat-message-container"
          );
          if (!container) return;

          // 더 이상 위쪽을 보고 있지 않으면 잠금 해제
          if (!isUserScrollingRef.current || lastScrollTopRef.current === null) {
            if (lockIntervalRef.current !== null) {
              window.clearInterval(lockIntervalRef.current);
              lockIntervalRef.current = null;
            }
            return;
          }

          // 라이브러리가 아래로 끌어내려도, 우리가 다시 사용자가 보던 위치로 되돌림
          container.scrollTop = lastScrollTopRef.current;
        }, 50);
      }
    };

    messageContainer.addEventListener("scroll", handleScroll);
    // 초기 상태 한 번 계산
    handleScroll();

    return () => {
      messageContainer.removeEventListener("scroll", handleScroll);
      if (lockIntervalRef.current !== null) {
        window.clearInterval(lockIntervalRef.current);
        lockIntervalRef.current = null;
      }
    };
  }, [isOpen, currentSessionKey]); // 세션 바뀌거나 창이 열릴 때만 리스너 부착

  // 2) 새 메시지가 추가될 때만, 사용자가 바닥 근처에 있을 경우에만 자동 스크롤
  useEffect(() => {
    if (!isOpen) return;

    const messageContainer = document.querySelector<HTMLDivElement>(
      ".react-chatbot-kit-chat-message-container"
    );
    if (!messageContainer) return;

    // 사용자가 위에서 과거 대화를 보는 중이면, 라이브러리의 자동 스크롤을 즉시 되돌린다.
    if (isUserScrollingRef.current && lastScrollTopRef.current !== null) {
      messageContainer.scrollTop = lastScrollTopRef.current;
      return;
    }

    // 그렇지 않으면(바닥 근처라면) 새 메시지에 맞춰 맨 아래로 스크롤
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }, [messages, isOpen]);

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
        <PatentModalProvider>
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
        </PatentModalProvider>
      </div>
    </div>
  );
};

export default ChatbotContainer;