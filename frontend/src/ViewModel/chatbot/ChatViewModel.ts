import { useState, useCallback, useEffect, useRef } from 'react';
import { chatService } from '@/Service/chatbot/chatService';


//메시지 객체 타입 정의
export interface Message {
    role: 'user'| 'assistant';
    content:string;
}

//세션 목록 아이템 타입 정의
interface ChatSession {
    session_id: string;
    title: string;
    updated_at: number;
}

const createDraftSessionKey = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draft-${(crypto as Crypto).randomUUID()}`;
  }
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const useChatViewModel = () => {
    // --- 상태 관리 (States) ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const currentSessionIdRef = useRef<string | null>(null);
    const [draftSessionKey, setDraftSessionKey] = useState<string>(createDraftSessionKey());
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // --- 초기 데이터 로드 ---
    const loadSessions = useCallback(async () => {
        const data = await chatService.getSessions();
        setSessions(data);
    }, []);

    useEffect(() => {
        loadSessions();  
    }, [loadSessions]);
    
    useEffect(() => {
      currentSessionIdRef.current = currentSessionId;
    }, [currentSessionId]);

    // --- 주요 액션 (Actions) --- 
    
    //1. 새 채팅 시작
    const createNewChat = () => {
        setCurrentSessionId(null);
        currentSessionIdRef.current = null;
        setDraftSessionKey(createDraftSessionKey());
        setMessages([]);
    };

    //2.과거 세션 선택 시 내역 불러오기
  const selectSession = async (sessionId: string) => {
    setIsLoading(true);
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
    try {
      const history = await chatService.getChatHistory(sessionId);
      setMessages(history);
    } catch (error) {
      console.error("내역 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 메시지 전송
  const sendMessage = async (userInput: string): Promise<string> => {
    if (!userInput.trim()) return "";

    // 사용자 메시지 화면에 즉시 추가
    const userMsg: Message = { role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const sessionIdToSend: string | null = currentSessionIdRef.current;
      // API 호출 (현재 session_id가 있으면 같이 보냄)
      const result = await chatService.sendMessage(userInput, sessionIdToSend);
      
      // AI 답변 추가
      const aiMsg: Message = { role: 'assistant', content: result.answer };
      setMessages((prev) => [...prev, aiMsg]);

      // 만약 새 채팅이었다면 받은 session_id 저장 및 목록 새로고침
      if (!sessionIdToSend) {
        setCurrentSessionId(result.session_id);
        currentSessionIdRef.current = result.session_id;
        await loadSessions(); 
      }
      return result.answer;
    } catch (error) {
      const errorText: string =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "답변을 생성하는 중 오류가 발생했습니다.";
      const errorMsg: Message = { 
        role: 'assistant', 
        content: errorText,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return errorMsg.content;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    const didDelete = await chatService.deleteSession(sessionId);
    if (!didDelete) return;
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    if (currentSessionIdRef.current === sessionId) {
      createNewChat();
    }
  };

  return {
    messages,
    sessions,
    currentSessionId,
    currentSessionKey: currentSessionId ?? draftSessionKey,
    isLoading,
    sendMessage,
    selectSession,
    createNewChat,
    deleteSession,
    refreshSessions: loadSessions
  };
};

