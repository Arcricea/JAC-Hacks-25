import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import '../styles/AIChatbot.css';

const ChatbotTrigger = ({ toggleChat }) => {
  return (
    <button className="chatbot-trigger" onClick={toggleChat}>
      <FontAwesomeIcon icon={faCommentDots} size="lg" />
    </button>
  );
};

export default ChatbotTrigger; 