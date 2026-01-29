import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const SkeletonBox = styled.div<{ $width?: string; $isLeft: boolean }>`
  width: ${props => props.$width || '60%'};
  height: 45px;
  margin-bottom: 12px;
  border-radius: 12px;
  align-self: ${props => props.$isLeft ? 'flex-start' : 'flex-end'};
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite linear;
`;

export const ChatSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: '15px' }}>
    <SkeletonBox $isLeft={true} $width="40%" />
    <SkeletonBox $isLeft={false} $width="70%" />
    <SkeletonBox $isLeft={true} $width="55%" />
    <SkeletonBox $isLeft={false} $width="30%" />
  </div>
);