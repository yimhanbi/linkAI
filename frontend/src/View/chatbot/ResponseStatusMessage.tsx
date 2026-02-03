interface ResponseStatusPayload {
  text: string;
}

interface ResponseStatusProps {
  payload?: ResponseStatusPayload;
}

export default function ResponseStatusMessage(props: ResponseStatusProps) {
  const text: string = props.payload?.text ?? "응답 완료";
  return (
    <div className="linkai-status-message">
      <span className="linkai-status-check" aria-hidden="true">✔</span>
      <span className="linkai-status-text">{text}</span>
    </div>
  );
}

