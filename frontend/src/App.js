import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('assignUsername', (assignedUsername) => {
      setUsername(assignedUsername);
    });

    newSocket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (socket && input.trim() && username) {
      socket.emit('chatMessage', input.trim());
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <h1>Simple Chat App</h1>
      <h3>Your name: <span style={{ color: 'green' }}>{username || 'Connecting...'}</span></h3>

      <div className="messages-container">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.username === username ? 'own-message' : ''}`}
          >
            <strong>{msg.username}: </strong>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={!socket}
        />
        <button type="submit" disabled={!socket || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;