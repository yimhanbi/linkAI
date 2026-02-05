import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./WelcomePage.css";

const USER_MSG =
  "dlOOswns이 발명한 특허가 있나요?";
const THINKING_MSG =
  "질문을 분석 중입니다... 'dlOOswns'을 '이O준'으로 정정합니다.";
const ANSWER_MSG = `다음으로 정리해 드립니다. ('dlOOswns'는 한영전환 오류로 보이며 '이O준'으로 정정)

이O준 발명 특허

10-2023-0097051: 귀 질환 진단 방법 및 장치

10-2021-0128479: 외부 저장소에 저장된 파일을 보호하는 방법 및 장치
`;

const USER_TYPING_MS = 58;
const THINKING_DURATION_MS = 2400;
const ANSWER_TYPING_MS = 22;
const HOLD_AFTER_ANSWER_MS = 5000;
const RESET_BEFORE_LOOP_MS = 900;

type Phase = "idle" | "userTyping" | "thinking" | "answerTyping" | "hold";

interface AIEngineDemoChatProps {
  /** When true, start or continue the demo animation (scroll in or hover). */
  trigger: boolean;
}

export default function AIEngineDemoChat({ trigger }: AIEngineDemoChatProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>("idle");
  const [userLen, setUserLen] = useState(0);
  const [answerLen, setAnswerLen] = useState(0);
  const hasCompletedOnce = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setUserLen(0);
    setAnswerLen(0);
  }, []);

  useEffect(() => {
    if (!trigger) {
      clearTimers();
      reset();
      hasCompletedOnce.current = false;
      return;
    }

    const runUserTyping = () => {
      setPhase("userTyping");
      setUserLen(0);
      let n = 0;
      const run = () => {
        if (n < USER_MSG.length) {
          n += 1;
          setUserLen(n);
          const t = setTimeout(run, USER_TYPING_MS);
          timers.current.push(t);
        } else {
          setPhase("thinking");
          const t = setTimeout(() => {
            setPhase("answerTyping");
            setAnswerLen(0);
            let m = 0;
            const runAnswer = () => {
              if (m < ANSWER_MSG.length) {
                m += 1;
                setAnswerLen(m);
                const t2 = setTimeout(runAnswer, ANSWER_TYPING_MS);
                timers.current.push(t2);
              } else {
                setPhase("hold");
                const t3 = setTimeout(() => {
                  reset();
                  hasCompletedOnce.current = true;
                  const t4 = setTimeout(runUserTyping, RESET_BEFORE_LOOP_MS);
                  timers.current.push(t4);
                }, HOLD_AFTER_ANSWER_MS);
                timers.current.push(t3);
              }
            };
            runAnswer();
          }, THINKING_DURATION_MS);
          timers.current.push(t);
        }
      };
      run();
    };

    if (phase === "idle" && !hasCompletedOnce.current) {
      runUserTyping();
    }
  }, [trigger, phase, reset, clearTimers]);

  const showUser = phase !== "idle";
  const showThinking = phase === "thinking";
  const showAnswer = phase === "answerTyping" || phase === "hold";
  const answerText = ANSWER_MSG.slice(0, answerLen);

  return (
    <div className="linkai-demo-chat">
      {showUser && (
        <motion.div
          className="linkai-demo-chat-row linkai-demo-chat-row-user"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="linkai-demo-chat-bubble linkai-demo-chat-bubble-user">
            <div className="linkai-demo-chat-bubble-inner">
              {USER_MSG.slice(0, userLen)}
            </div>
          </div>
        </motion.div>
      )}

      {showThinking && (
        <motion.div
          className="linkai-demo-chat-row linkai-demo-chat-row-bot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="linkai-demo-chat-thinking">
            <div className="linkai-demo-chat-thinking-skeleton" aria-hidden />
            <span className="linkai-demo-chat-thinking-text">{THINKING_MSG}</span>
          </div>
        </motion.div>
      )}

      {showAnswer && (
        <motion.div
          className="linkai-demo-chat-row linkai-demo-chat-row-bot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className="linkai-demo-chat-bubble linkai-demo-chat-bubble-bot">
            <div className="linkai-demo-chat-bubble-inner linkai-demo-chat-answer-inner">
              <span className="linkai-demo-chat-answer-text">{answerText}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
