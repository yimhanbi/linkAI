interface ProgressMessagePayload {
  text: string;
}

interface ProgressMessageProps {
  payload?: ProgressMessagePayload;
}

export default function ProgressMessage(props: ProgressMessageProps) {
  const text: string = props.payload?.text ?? "답변을 생성중입니다...";
  return (
    <div className="linkai-progress-message">
      <div className="linkai-progress-avatar" aria-hidden="true">
        B
      </div>
      <div className="linkai-progress-content">
        <div className="linkai-progress-skeleton" aria-hidden="true">
          <div className="linkai-skeleton-line linkai-skeleton-line--lg" />
          <div className="linkai-skeleton-line linkai-skeleton-line--md" />
          <div className="linkai-skeleton-line linkai-skeleton-line--sm" />
        </div>
        <div className="linkai-progress-caption">{text}</div>
      </div>
    </div>
  );
}

