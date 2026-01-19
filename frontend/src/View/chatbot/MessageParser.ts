class MessageParser {
    actionProvider: any;


    constructor(actionProvider: any){
        this.actionProvider = actionProvider;
    }

    parse(message:string){
        const lowercase = message.toLowerCase();


        //단순 인사 처리
        if (lowercase.includes("안녕")  || lowercase.includes("hello") || lowercase.includes("hi")) {
            return this.actionProvider.greet();
        }


        //그 외 모든 질문은 특허 분석 핸들러(LLM 연동)로 전달
        //비어있지 않은 메시징ㄹ 경우에만 처리한다.
        if (message.trim().length > 0){
            this.actionProvider.handleUserQuery(message);
        }
    }
}

export default MessageParser;