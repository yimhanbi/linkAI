import React, { useMemo } from "react";
import { tokenizePatentNumbers, type PatentToken } from "./patent_linkify";
import { usePatentModal } from "./patent_modal_context";

type Props = {
  message?: string;
};

export default function LinkifiedBotChatMessage(props: Props) {
  const { openPatentModal } = usePatentModal();
  const message: string = props.message ?? "";

  const tokens: PatentToken[] = useMemo(() => tokenizePatentNumbers(message), [message]);

  return (
    <div className="react-chatbot-kit-chat-bot-message-container">
      <div className="react-chatbot-kit-chat-bot-message">
        {tokens.map((t, idx) => {
          if (t.type === "text") {
            return <React.Fragment key={idx}>{t.value}</React.Fragment>;
          }
          return (
            <button
              key={idx}
              type="button"
              className="linkai-patent-link"
              onClick={() => openPatentModal(t.normalized)}
            >
              {t.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

