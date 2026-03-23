import React, { useState, useEffect, useRef } from 'react';
import './ChatbotPanel.css';

const ChatbotPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('https://n8n.srv1306518.hstgr.cloud/webhook/kivo-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response || 'Message received.' }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error - invalid response.' }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error connecting to webhook.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        className={`chatbot-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chatbot"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          )}
        </svg>
      </button>

      <div className={`chatbot-popup ${isOpen ? 'visible' : ''}`}>
        <div className="chatbot-header">
          <h3>KIVO Assistant</h3>
        </div>
        <div className="chatbot-messages">
          {messages.length === 0 ? (
            <div className="chatbot-welcome">
              How can I help you modify appointments?
            </div>
          ) : (
            <div className="chat-history">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="chat-bubble assistant typing-indicator">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <div className="chatbot-input-area">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="chatbot-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatbotPanel;
