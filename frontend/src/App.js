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
      <div className="chat-header">
        <h1>whismur</h1>
        <div className="user-info">
          You are: <span className="username">{username || 'Connecting...'}</span>
        </div>
      </div>

    <div className="messages-container">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`message ${
            msg.username === 'System' 
              ? 'system' 
              : msg.username === username 
                ? 'own' 
                : 'other'
          }`}
        >
          {msg.username !== 'System' && msg.username !== username && (
            <span className="sender">{msg.username}</span>
          )}
          {msg.text}
        </div>
      ))}
    </div>

    <form onSubmit={sendMessage} className="message-form">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
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