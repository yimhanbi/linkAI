
import styled from 'styled-components';
import { ChatSkeleton } from './ChatSkeleton';

interface Props {
  status: 'loading' | 'timeout' | 'error';
  onRetry: () => void;
}

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: #888;
`;

const RetryButton = styled.button`
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover { background-color: #2980b9; }
`;

export const LoadingFallback = ({ status, onRetry }: Props) => {
  return (
    <div>
      <ChatSkeleton />
      <MessageWrapper>
        {status === 'loading' && <p>이전 대화 기록을 불러오고 있습니다...</p>}
        {status === 'timeout' && (
          <>
            <p>네트워크 연결이 지연되고 있습니다.</p>
            <RetryButton onClick={onRetry}>다시 시도</RetryButton>
          </>
        )}
      </MessageWrapper>
    </div>
  );
};