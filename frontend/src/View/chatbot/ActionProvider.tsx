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

type GetBotResponse = (inputMessage: string) => Promise<string>;

type SetChatbotState = (updater: (prevState: ChatbotStateShape) => ChatbotStateShape) => void;
type CreateChatBotMessage = (message: string, options?: Record<string, unknown>) => ChatMessage;

class ActionProvider {
  private readonly createChatBotMessage: CreateChatBotMessage;
  private readonly setState: SetChatbotState;
  private loadingIntervalId: number | null;
  private readonly chatbotStateLike: unknown;

  constructor(
    createChatBotMessage: CreateChatBotMessage,
    setStateFunc: SetChatbotState,
    _createClientMessage?: unknown,
    chatbotState?: unknown
  ) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.loadingIntervalId = null;
    this.chatbotStateLike = chatbotState ?? null;
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
      const getBotResponse: GetBotResponse | undefined = this.resolveGetBotResponse(this.chatbotStateLike);
      if (!getBotResponse) {
        const meta: string = this.describeChatbotStateLike(this.chatbotStateLike);
        throw new Error(`getBotResponse is not provided in chatbot state (${meta})`);
      }
      const response: string = await getBotResponse(message);
      this.clearIntervals();
      this.removeMessage(progressMessageId);
      const botMessage: ChatMessage = this.createChatBotMessage(response);
      this.updateChatbotState(botMessage);
    } catch (error) {
      this.clearIntervals();
      this.removeMessage(progressMessageId);
      // eslint-disable-next-line no-console
      console.error("Chatbot error:", error);
      const errorText: string =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      const errorMessage: ChatMessage = this.createChatBotMessage(
        `에러가 발생했습니다.\n${errorText}`
      );
      this.updateChatbotState(errorMessage);
    }
  };

  private updateChatbotState = (message: ChatMessage): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: [...prevState.messages, message],
    }));
  };

  private resolveGetBotResponse = (value: unknown): GetBotResponse | undefined => {
    // Global fallback (set by ChatbotContainer) must work even when the 4th arg is undefined/null.
    const globalValue: unknown = (window as unknown as { __LINKAI_GET_BOT_RESPONSE?: unknown })
      .__LINKAI_GET_BOT_RESPONSE;
    if (typeof globalValue === "function") return globalValue as GetBotResponse;

    if (!value || typeof value !== "object") return undefined;
    const asRecord = value as Record<string, unknown>;
    const direct = asRecord.getBotResponse;
    if (typeof direct === "function") return direct as GetBotResponse;

    const current = asRecord.current;
    if (current && typeof current === "object") {
      const currentRecord = current as Record<string, unknown>;
      const fromCurrent = currentRecord.getBotResponse;
      if (typeof fromCurrent === "function") return fromCurrent as GetBotResponse;
      const nestedState = currentRecord.state;
      if (nestedState && typeof nestedState === "object") {
        const nestedRecord = nestedState as Record<string, unknown>;
        const fromNested = nestedRecord.getBotResponse;
        if (typeof fromNested === "function") return fromNested as GetBotResponse;
      }
    }

    const nestedState = asRecord.state;
    if (nestedState && typeof nestedState === "object") {
      const nestedRecord = nestedState as Record<string, unknown>;
      const fromNested = nestedRecord.getBotResponse;
      if (typeof fromNested === "function") return fromNested as GetBotResponse;
    }

    return undefined;
  };

  private describeChatbotStateLike = (value: unknown): string => {
    if (value === null) return "value=null";
    if (value === undefined) return "value=undefined";
    if (typeof value !== "object") return `type=${typeof value}`;
    const keys = Object.keys(value as Record<string, unknown>).slice(0, 10).join(",");
    const hasCurrent = "current" in (value as Record<string, unknown>);
    const hasState = "state" in (value as Record<string, unknown>);
    return `keys=[${keys}] hasCurrent=${hasCurrent} hasState=${hasState}`;
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

  private setProgressText = (messageId: number, text: string): void => {
    this.setState((prevState: ChatbotStateShape) => ({
      ...prevState,
      messages: prevState.messages.map((message: ChatMessage) => {
        if (message.id !== messageId) return message;
        return { ...message, payload: { text } };
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
  };

  private clearLoadingInterval = (): void => {
    if (this.loadingIntervalId === null) return;
    window.clearInterval(this.loadingIntervalId);
    this.loadingIntervalId = null;
  };

  private createUniqueId = (): number => {
    return Math.round(Date.now() * Math.random());
  };
}

export default ActionProvider;