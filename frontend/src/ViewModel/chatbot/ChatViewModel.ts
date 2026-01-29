import { useState, useCallback, useEffect, useRef } from 'react';
import { chatService } from '@/Service/chatbot/chatService';
import {
  saveSessionsToStorage,
  loadSessionsFromStorage,
  saveHistoryToStorage,
  loadHistoryFromStorage,
  deleteHistoryFromStorage,
  type CachedSession,
  type CachedMessage,
} from '@/Service/chatbot/chatStorage';


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
    const loadSessionsRequestIdRef = useRef<number>(0);
    const [status, setStatus] = useState<'loading' | 'success' | 'timeout' | 'error'>('loading');

    // --- 초기 데이터 로드 ---
    const loadSessions = useCallback(async () => {
        const requestId: number = loadSessionsRequestIdRef.current + 1;
        loadSessionsRequestIdRef.current = requestId;
        
        // 먼저 localStorage에서 캐시 확인
        const cachedSessions = loadSessionsFromStorage();
        if (cachedSessions && cachedSessions.length > 0) {
            setSessions(cachedSessions as ChatSession[]);
        }
        
        // 서버에서 최신 데이터 가져오기 (백그라운드)
        const data = await chatService.getSessions();
        if (loadSessionsRequestIdRef.current !== requestId) return;
        
        // 서버 데이터를 상태에 반영하고 localStorage에 저장
        const serverSessions = data as ChatSession[];
        setSessions(serverSessions);
        saveSessionsToStorage(serverSessions as CachedSession[]);
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
        // 새 채팅이므로 localStorage에 저장할 필요 없음 (아직 세션이 생성되지 않음)
    };

    //2.과거 세션 선택 시 내역 불러오기
  const selectSession = async (sessionId: string) => {

    setStatus('loading');
    setIsLoading(true);
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;


    // 10초 지났는데 여전히 로딩 중이라면 timeout 상태로 변경
    const timeoutId = setTimeout(()  => {

      setStatus(prev => prev == 'loading' ? 'timeout' : prev);
    },10000);
    
    // 먼저 localStorage에서 캐시 확인
    const cachedHistory = loadHistoryFromStorage(sessionId);
    if (cachedHistory && cachedHistory.length > 0) {
      setMessages(cachedHistory as Message[]);
      setIsLoading(false);
    }
    
    // 서버에서 최신 데이터 가져오기 (백그라운드)
    try {
      const history = await chatService.getChatHistory(sessionId);
      setMessages(history);
      // 서버에서 가져온 데이터를 localStorage에 저장
      saveHistoryToStorage(sessionId, history as CachedMessage[]);
    } catch (error) {
      console.error("내역 로드 실패:", error);
      // 에러 발생 시 캐시된 데이터가 있으면 그대로 유지
      if (!cachedHistory || cachedHistory.length === 0) {
        setMessages([]);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };



  // 3. 메시지 전송
  const sendMessage = async (userInput: string): Promise<string> => {
    if (!userInput.trim()) return "";

      // 사용자 메시지 화면에 즉시 추가
      const userMsg: Message = { role: 'user', content: userInput };
      setMessages((prev) => {
        const updated = [...prev, userMsg];
        // localStorage에 즉시 저장 (세션이 있는 경우)
        const sessionIdToCheck = currentSessionIdRef.current;
        if (sessionIdToCheck) {
          saveHistoryToStorage(sessionIdToCheck, updated as CachedMessage[]);
        }
        return updated;
      });
      setIsLoading(true);

    try {
      const sessionIdToSend: string | null = currentSessionIdRef.current;
      // API 호출 (현재 session_id가 있으면 같이 보냄)
      const result = await chatService.sendMessage(userInput, sessionIdToSend);
      
      // AI 답변 추가
      const aiMsg: Message = { role: 'assistant', content: result.answer };
      setMessages((prev) => {
        const updated = [...prev, aiMsg];
        // localStorage에 즉시 저장
        const effectiveSessionId: string = sessionIdToSend ?? result.session_id;
        saveHistoryToStorage(effectiveSessionId, updated as CachedMessage[]);
        return updated;
      });

      const effectiveSessionId: string = sessionIdToSend ?? result.session_id;
      const title: string = userInput.length > 25 ? `${userInput.slice(0, 25)}...` : userInput;

      // Keep sidebar title in sync with what user actually asked
      setSessions((prev) => {
        const existing = prev.find((s) => s.session_id === effectiveSessionId);
        const updated: ChatSession = {
          session_id: effectiveSessionId,
          title,
          updated_at: Date.now(),
        };
        if (!existing) return [updated, ...prev];
        return [
          updated,
          ...prev.filter((s) => s.session_id !== effectiveSessionId),
        ];
      });

      // If it was a new chat, persist the real session id and refresh from server
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
      setMessages((prev) => {
        const updated = [...prev, errorMsg];
        // localStorage에 에러 메시지도 저장
        const sessionIdToCheck = currentSessionIdRef.current;
        if (sessionIdToCheck) {
          saveHistoryToStorage(sessionIdToCheck, updated as CachedMessage[]);
        }
        return updated;
      });
      return errorMsg.content;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    const didDelete = await chatService.deleteSession(sessionId);
    if (!didDelete) return;
    setSessions((prev) => {
      const updated = prev.filter((s) => s.session_id !== sessionId);
      // localStorage에서도 삭제
      saveSessionsToStorage(updated as CachedSession[]);
      return updated;
    });
    // localStorage에서 해당 세션의 히스토리도 삭제
    deleteHistoryFromStorage(sessionId);
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
    status,
    deleteSession,
    refreshSessions: loadSessions
  };
};

