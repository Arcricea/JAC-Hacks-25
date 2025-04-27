import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTimes, faRobot } from '@fortawesome/free-solid-svg-icons';
import '../styles/AIChatbot.css';
import { sendMessageToAI } from '../services/aiService';

const AIChatbot = ({ isOpen, toggleChat }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your food donation assistant. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setDebugInfo('');

    try {
      console.log('Sending message to AI:', input);
      
      // Always try to use the API first
      const response = await sendMessageToAI(input);
      
      const assistantResponse = {
        role: 'assistant',
        content: response
      };
      
      setMessages(prevMessages => [...prevMessages, assistantResponse]);
    } catch (error) {
      console.error('Error communicating with AI:', error);
      setDebugInfo(`Error: ${error.message}`);
      
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error. Please try again later. 
                 Error details: ${error.message}`
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      
      // Fall back to simulated responses
      setTimeout(() => {
        const fallbackResponse = {
          role: 'assistant',
          content: `I'm using a fallback response system now. ${getSimulatedResponse(input)}`
        };
        
        setMessages(prevMessages => [...prevMessages, fallbackResponse]);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to simulate responses based on user input
  const getSimulatedResponse = (userInput) => {
    const normalizedInput = userInput.toLowerCase();
    
    if (normalizedInput.includes('hello') || normalizedInput.includes('hi')) {
      return 'Hello! How can I assist you with food donations today?';
    } else if (normalizedInput.includes('donation') || normalizedInput.includes('donate')) {
      return 'To make a donation, you can navigate to the donation form from your dashboard. Would you like more information about the donation process?';
    } else if (normalizedInput.includes('food bank') || normalizedInput.includes('location')) {
      return 'There are several food banks in your area. You can use our map feature to find the closest one to you. Would you like me to explain how to use the map?';
    } else if (normalizedInput.includes('volunteer')) {
      return 'We always need volunteers! You can sign up for volunteer opportunities through the Volunteer Dashboard. Would you like me to show you how to register as a volunteer?';
    } else if (normalizedInput.includes('thanks') || normalizedInput.includes('thank you')) {
      return "You're welcome! Is there anything else I can help you with?";
    } else {
      return "I'm here to help with anything related to food donations, volunteering, or connecting with food banks. Could you please provide more details about what you're looking for?";
    }
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <div className="chatbot-header">
        <div className="chatbot-title">
          <FontAwesomeIcon icon={faRobot} className="robot-icon" />
          <span>Food Donation Assistant</span>
        </div>
        <button className="close-button" onClick={toggleChat}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        {debugInfo && (
          <div className="debug-info">
            <small>{debugInfo}</small>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chatbot-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <FontAwesomeIcon icon={faPaperPlane} />
        </button>
      </form>
    </div>
  );
};

export default AIChatbot; 