import React from "react";
import { createChatBotMessage } from "react-chatbot-kit";
import ProgressMessage from "./ProgressMessage";


//챗봇의 브랜드 컬러
const themeColor = '#1890ff';

const config = {
    botName: "LinkAI Bot",


    // 처음 대화창을 열었을 때 나오는 메시지
    initialMessages: [
        createChatBotMessage('안녕하세요! LinkAI 특허 분석 도우미입니다.',{}),
        createChatBotMessage('궁금하신 특허 번호나 기술 키워드를 입력해 주세요. 제가 분석해 드릴게요!',{
            delay:500,
        }),
    ],


    customStyle:{
        botMessageBox: {
            backgroundColor: themeColor,
        },
        chatButton: {
            backgroundColor: themeColor,
        },
    },

    // 챗봇 상단 헤더 등 커스텀 컴포넌트 설정 가능
    customComponents:{},

    // 커스텀 메시지(스켈레톤/상태 표시 등)
    customMessages: {
        progress: (props: unknown) => React.createElement(ProgressMessage, props as object),
    },

    //대화창 내부의 상태값 초기화
    state:{
        patentResult:[],
    },
};

export default config;