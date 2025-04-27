import React, { useState } from 'react';
import AIChatbot from './AIChatbot';
import ChatbotTrigger from './ChatbotTrigger';

const ChatbotWrapper = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      <AIChatbot isOpen={isChatOpen} toggleChat={toggleChat} />
      <ChatbotTrigger toggleChat={toggleChat} />
    </>
  );
};

export default ChatbotWrapper; 