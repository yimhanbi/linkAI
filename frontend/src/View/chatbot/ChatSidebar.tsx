import React from "react";

export type ChatSessionListItem = {
  session_id: string;
  title?: string;
  updated_at?: number;
};

type Props = {
  sessions?: ChatSessionListItem[];
  // New prop names (used by ChatViewModel integration)
  currentId?: string | null;
  onSelect?: (sessionId: string) => void | Promise<void>;
  onNewChat?: () => void;
  onDelete?: (sessionId: string) => void | Promise<void>;

  // Backward-compatible prop names (older container)
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void | Promise<void>;
  onNewSession?: () => void;
  onClose?: () => void;
};

const ChatSidebar: React.FC<Props> = ({
  sessions = [],
  currentId,
  onSelect,
  onNewChat,
  onDelete,
  selectedSessionId,
  onSelectSession,
  onNewSession,
  onClose,
}) => {
  const safeSessions: ChatSessionListItem[] = Array.isArray(sessions)
    ? sessions.filter(
        (s): s is ChatSessionListItem =>
          Boolean(s) && typeof (s as ChatSessionListItem).session_id === "string"
      )
    : [];

  const activeId: string | null | undefined = currentId ?? selectedSessionId;
  const handleSelect = onSelect ?? onSelectSession;
  const handleNew = onNewChat ?? onNewSession;

  const handleDelete = onDelete;

  return (
    <aside className="chatbot-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">새 채팅</h2>
        <div className="sidebar-actions">
          <button className="new-chat-btn" type="button" onClick={handleNew}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
          {onClose ? (
            <button className="close-btn" type="button" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="sidebar-list">
        {safeSessions.length === 0 ? (
          <div className="empty-state">No sessions</div>
        ) : (
          safeSessions.map((s) => (
            <div
              key={s.session_id}
              role="button"
              tabIndex={0}
              className={`session-item ${s.session_id === activeId ? "active" : ""}`}
              onClick={() => void handleSelect?.(s.session_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleSelect?.(s.session_id);
                }
              }}
            >
              <span className="session-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className="session-text">{s.title ?? "새로운 대화"}</span>
              {handleDelete ? (
                <button
                  type="button"
                  className="session-delete-btn"
                  aria-label="Delete session"
                  onClick={(e) => {
                    e.stopPropagation();
                    const title = s.title ?? "새로운 대화";
                    const ok = window.confirm(`"${title}" 대화 기록을 삭제할까요?`);
                    if (!ok) return;
                    void handleDelete(s.session_id);
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;

