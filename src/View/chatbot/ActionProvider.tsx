import { useChatbotStore } from '@/ViewModel/useChatbotVM';

class ActionProvider {
  private readonly createChatBotMessage: any;
  private readonly setState: any;

  constructor(createChatBotMessage: any, setStateFunc: any) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
  }

  greet = (): void => {
    const message: any = this.createChatBotMessage('안녕하세요! LinkAI 특허 도우미입니다.');
    this.updateChatbotState(message);
  };

  handleUserQuery = async (message: string): Promise<void> => {
    try {
      const getBotResponse: ((inputMessage: string) => Promise<string>) =
        useChatbotStore.getState().getBotResponse;
      const response: string = await getBotResponse(message);
      const botMessage: any = this.createChatBotMessage(response);
      this.updateChatbotState(botMessage);
    } catch (error) {
      const errorMessage: any = this.createChatBotMessage('에러가 발생했습니다.');
      this.updateChatbotState(errorMessage);
    }
  };

  private updateChatbotState = (message: any): void => {
    this.setState((prevState: any) => ({
      ...prevState,
      messages: [...prevState.messages, message],
    }));
  };
}

export default ActionProvider;