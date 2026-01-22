import { useState, useCallback, useEffect} from 'react';
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

export const useChatViewModel = () => {
    // --- 상태 관리 (States) ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // --- 초기 데이터 로드 ---
    const loadSessions = useCallback(async () => {
        const data = await chatService.getSessions();
        setSessions(data);
    }, []);

    useEffect(() => {
        loadSessions();  
    }, [loadSessions]);

    // --- 주요 액션 (Actions) --- 
    
    //1. 새 채팅 시작
    const createNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
    };

    //2.과거 세션 선택 시 내역 불러오기
  const selectSession = async (sessionId: string) => {
    setIsLoading(true);
    setCurrentSessionId(sessionId);
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
  const sendMessage = async (userInput: string) => {
    if (!userInput.trim()) return;

    // 사용자 메시지 화면에 즉시 추가
    const userMsg: Message = { role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // API 호출 (현재 session_id가 있으면 같이 보냄)
      const result = await chatService.sendMessage(userInput, currentSessionId);
      
      // AI 답변 추가
      const aiMsg: Message = { role: 'assistant', content: result.answer };
      setMessages((prev) => [...prev, aiMsg]);

      // 만약 새 채팅이었다면 받은 session_id 저장 및 목록 새로고침
      if (!currentSessionId) {
        setCurrentSessionId(result.session_id);
        await loadSessions(); 
      }
    } catch (error) {
      const errorMsg: Message = { 
        role: 'assistant', 
        content: "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다." 
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    sessions,
    currentSessionId,
    isLoading,
    sendMessage,
    selectSession,
    createNewChat,
    refreshSessions: loadSessions
  };
};

