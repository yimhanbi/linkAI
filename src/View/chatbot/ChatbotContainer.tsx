import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './Chatbot.css';

import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { useChatbotStore } from '@/ViewModel/useChatbotVM';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ChatbotContainer = () => {
  const location = useLocation();
  const { isOpen, openChatbot, closeChatbot } = useChatbotStore();

  useEffect(() => {
    if (location.pathname === '/chatbot') {
      openChatbot();
      return;
    }
    closeChatbot();
  }, [location.pathname, openChatbot, closeChatbot]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="chatbot-wrapper">
      <div className="chatbot-window">
        <Chatbot
          config={config}
          messageParser={MessageParser}
          actionProvider={ActionProvider}
        />
      </div>
    </div>
  );
};

export default ChatbotContainer;