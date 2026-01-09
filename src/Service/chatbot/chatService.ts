export const chatService = {
  async sendMessage(message: string): Promise<string> {
    try {
      console.log("사용자 질문:", message);
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve('AI 서비스 준비중 ');
        }, 500);
      });
    } catch (error) {
      console.error("Chat API Error", error);
      return "엔진 연결에 실패했습니다. 관리자에게 문의하세요.";
    }
  },
};