/**
 * localStorage를 사용한 채팅 히스토리 캐싱 유틸리티
 */

const STORAGE_KEY_SESSIONS = "chat_sessions";
const STORAGE_KEY_SESSIONS_TIMESTAMP = "chat_sessions_timestamp";
const STORAGE_KEY_HISTORY_PREFIX = "chat_history_";
// 세션 목록 캐시 TTL: 30분 (세션 목록은 자주 변경되지 않으므로 긴 TTL 사용)
// 메시지 히스토리는 실시간으로 저장되므로 TTL 불필요
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분

export interface CachedSession {
  session_id: string;
  title: string;
  updated_at: number;
}

export interface CachedMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

/**
 * 세션 목록을 localStorage에 저장
 */
export const saveSessionsToStorage = (sessions: CachedSession[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEY_SESSIONS_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.warn("Failed to save sessions to localStorage:", error);
  }
};

/**
 * localStorage에서 세션 목록을 불러오기
 * @param ignoreTTL TTL 체크를 무시하고 항상 캐시를 반환할지 여부 (기본값: false)
 * @returns 캐시된 세션 목록 또는 null (캐시가 없거나 만료된 경우)
 */
export const loadSessionsFromStorage = (ignoreTTL: boolean = false): CachedSession[] | null => {
  try {
    const sessionsStr = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!sessionsStr) return null;

    const sessions = JSON.parse(sessionsStr) as CachedSession[];
    if (!Array.isArray(sessions)) return null;

    // TTL 체크를 무시하는 경우 (항상 캐시 사용)
    if (ignoreTTL) {
      return sessions;
    }

    // TTL 체크
    const timestampStr = localStorage.getItem(STORAGE_KEY_SESSIONS_TIMESTAMP);
    if (!timestampStr) return sessions; // 타임스탬프가 없어도 데이터가 있으면 사용

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return sessions; // 타임스탬프 파싱 실패해도 데이터가 있으면 사용

    // 캐시가 만료되었는지 확인
    const age = Date.now() - timestamp;
    if (age > CACHE_TTL_MS) {
      return null; // 캐시 만료
    }

    return sessions;
  } catch (error) {
    console.warn("Failed to load sessions from localStorage:", error);
    return null;
  }
};

/**
 * 특정 세션의 메시지 히스토리를 localStorage에 저장
 */
export const saveHistoryToStorage = (sessionId: string, messages: CachedMessage[]): void => {
  try {
    const key = `${STORAGE_KEY_HISTORY_PREFIX}${sessionId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.warn(`Failed to save history for session ${sessionId} to localStorage:`, error);
  }
};

/**
 * localStorage에서 특정 세션의 메시지 히스토리를 불러오기
 */
export const loadHistoryFromStorage = (sessionId: string): CachedMessage[] | null => {
  try {
    const key = `${STORAGE_KEY_HISTORY_PREFIX}${sessionId}`;
    const historyStr = localStorage.getItem(key);
    if (!historyStr) return null;

    const messages = JSON.parse(historyStr) as CachedMessage[];
    if (!Array.isArray(messages)) return null;

    return messages;
  } catch (error) {
    console.warn(`Failed to load history for session ${sessionId} from localStorage:`, error);
    return null;
  }
};

/**
 * 특정 세션의 메시지 히스토리를 localStorage에서 삭제
 */
export const deleteHistoryFromStorage = (sessionId: string): void => {
  try {
    const key = `${STORAGE_KEY_HISTORY_PREFIX}${sessionId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to delete history for session ${sessionId} from localStorage:`, error);
  }
};

/**
 * 모든 채팅 관련 데이터를 localStorage에서 삭제 (로그아웃 등에 사용)
 */
export const clearAllChatStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_SESSIONS_TIMESTAMP);
    // 모든 chat_history_* 키 삭제
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_HISTORY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Failed to clear chat storage from localStorage:", error);
  }
};
