import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './ChatbotPanel.css';

const ChatbotPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // Simulate backend response - In a real app this would call n8n or OpenAI
      setTimeout(() => {
        const botResponse = { 
          role: 'assistant', 
          content: `Soy tu asistente KIVO. ¿En qué puedo ayudarte con tus citas?` 
        };
        setChatHistory(prev => [...prev, botResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className="chatbot-fab" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir asistente"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      <div className={`chatbot-popup ${isOpen ? 'visible' : ''}`}>
        <div className="chatbot-header">
          <h3>Asistente KIVO</h3>
        </div>
        
        <div className="chatbot-messages">
          {chatHistory.length === 0 && (
            <div className="chatbot-welcome">
              ¡Hola! Soy tu asistente inteligente. Pregúntame lo que necesites sobre tus citas.
            </div>
          )}
          <div className="chat-history">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="typing-indicator">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form className="chatbot-input-area" onSubmit={handleSendMessage}>
          <textarea 
            placeholder="Pregúntame algo..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button type="submit" className="chatbot-send-btn" disabled={!message.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatbotPanel;
