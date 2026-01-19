import { useChatbotStore } from '@/ViewModel/useChatbotVM';

interface ChatMessage {
  id: number;
  type: string;
  message: string;
  loading?: boolean;
  delay?: number;
  payload?: unknown;
}

interface ChatbotStateShape {
  messages: ChatMessage[];
}

type SetChatbotState = (updater: (prevState: ChatbotStateShape) => ChatbotStateShape) => void;
type CreateChatBotMessage = (message: string, options?: Record<string, unknown>) => ChatMessage;

class ActionProvider {
  private readonly createChatBotMessage: CreateChatBotMessage;
  private readonly setState: SetChatbotState;
  private loadingIntervalId: number | null;
  private typingIntervalId: number | null;

  constructor(createChatBotMessage: CreateChatBotMessage, setStateFunc: SetChatbotState) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.loadingIntervalId = null;
    this.typingIntervalId = null;
  }

  greet = (): void => {
    const message: ChatMessage = this.createChatBotMessage('안녕하세요! LinkAI 특허 도우미입니다.');
    this.updateChatbotState(message);
  };

  handleUserQuery = async (message: string): Promise<void> => {
    this.clearIntervals();
    const progressMessageId: number = this.createUniqueId();
    this.addProgressMessage(progressMessageId, "AI 검색을 준비중입니다...");
    this.startProgressTicker(progressMessageId);
    try {
      const getBotResponse: ((inputMessage: string) => Promise<string>) =
        useChatbotStore.getState().getBotResponse;
      const response: string = await getBotResponse(message);
      this.clearIntervals();
      this.removeMessage(progressMessageId);
      const typingMessage: ChatMessage = this.createChatBotMessage("");
      this.updateChatbotState(typingMessage);
      this.setMessageLoading(typingMessage.id, false);
      this.startTypingEffect(typingMessage.id, response);
    } catch (error) {
      this.clearIntervals();
      this.removeMessage(progressMessageId);
      const errorMessage: ChatMessage = this.createChatBotMessage('에러가 발생했습니다.');
      this.updateChatbotState(errorMessage);
    }
  };

  private updateChatbotState = (message: ChatMessage): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: [...prevState.messages, message],
    }));
  };

  private addProgressMessage = (messageId: number, text: string): void => {
    const progressMessage: ChatMessage = {
      id: messageId,
      type: "progress",
      message: "",
      payload: { text },
    };
    this.updateChatbotState(progressMessage);
  };

  private startProgressTicker = (messageId: number): void => {
    const phases: string[] = [
      "AI 검색 벡터DB를 검색중입니다",
      "특허 데이터를 조회중입니다",
      "답변을 생성중입니다",
    ];
    let phaseIndex: number = 0;
    let dotCount: number = 0;
    const tick = () => {
      dotCount = (dotCount + 1) % 4;
      const dots: string = ".".repeat(dotCount);
      const text: string = `${phases[phaseIndex]}${dots}`;
      phaseIndex = (phaseIndex + 1) % phases.length;
      this.setProgressText(messageId, text);
    };
    tick();
    this.loadingIntervalId = window.setInterval(tick, 2000);
  };

  private startTypingEffect = (messageId: number, fullText: string): void => {
    const targetTotalTypingDurationMs: number = 20000;
    const minTypingDelayMs: number = 12;
    const maxTypingDelayMs: number = 90;
    const safeLength: number = Math.max(fullText.length, 1);
    const computedTypingDelayMs: number = Math.floor(targetTotalTypingDurationMs / safeLength);
    const typingDelayMs: number = Math.min(
      maxTypingDelayMs,
      Math.max(minTypingDelayMs, computedTypingDelayMs)
    );
    let index: number = 0;
    this.typingIntervalId = window.setInterval(() => {
      index += 1;
      const nextText: string = fullText.slice(0, index);
      this.setBotMessageText(messageId, nextText);
      if (index >= fullText.length) {
        this.clearTypingInterval();
      }
    }, typingDelayMs);
  };

  private setProgressText = (messageId: number, text: string): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: prevState.messages.map((message: ChatMessage) => {
        if (message.id !== messageId) return message;
        return { ...message, payload: { text } };
      }),
    }));
  };

  private setBotMessageText = (messageId: number, text: string): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: prevState.messages.map((message: ChatMessage) => {
        if (message.id !== messageId) return message;
        return { ...message, message: text };
      }),
    }));
  };

  private setMessageLoading = (messageId: number, isLoading: boolean): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: prevState.messages.map((message: ChatMessage) => {
        if (message.id !== messageId) return message;
        return { ...message, loading: isLoading };
      }),
    }));
  };

  private removeMessage = (messageId: number): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: prevState.messages.filter((message: ChatMessage) => message.id !== messageId),
    }));
  };

  private clearIntervals = (): void => {
    this.clearLoadingInterval();
    this.clearTypingInterval();
  };

  private clearLoadingInterval = (): void => {
    if (this.loadingIntervalId === null) return;
    window.clearInterval(this.loadingIntervalId);
    this.loadingIntervalId = null;
  };

  private clearTypingInterval = (): void => {
    if (this.typingIntervalId === null) return;
    window.clearInterval(this.typingIntervalId);
    this.typingIntervalId = null;
  };

  private createUniqueId = (): number => {
    return Math.round(Date.now() * Math.random());
  };
}

export default ActionProvider;