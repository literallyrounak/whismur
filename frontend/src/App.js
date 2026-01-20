import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authView, setAuthView] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showProfile, setShowProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [currentDM, setCurrentDM] = useState(null);
  const [showStartDM, setShowStartDM] = useState(false);
  const [dmUsername, setDmUsername] = useState('');
  const [dmError, setDmError] = useState('');
  const [activeDMs, setActiveDMs] = useState(new Set());
  const [dmNames, setDmNames] = useState(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('privateMessage', (msg) => {
      const safeMsg = {
        ...msg,
        timestamp: Number(msg.timestamp) || Date.now(),
        seenCount: msg.seenCount ?? 1
      };
      setMessages((prev) => [...prev, safeMsg]);
      
      setActiveDMs((prev) => new Set([...prev, msg.from]));
      setDmNames((prev) => new Map([...prev, [msg.from, msg.from]]));
      
      if (safeMsg.id) {
        newSocket.emit('seen', { messageId: safeMsg.id });
      }
    });

    newSocket.on('messageSeenUpdate', ({ messageId, count }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, seenCount: count } : m))
      );
    });

    newSocket.on('typing', ({ user, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(user);
        else next.delete(user);
        return next;
      });
    });

    newSocket.on('yourDisplayName', (name) => {
      setDisplayName(name);
    });

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleAuth = (e) => {
    e.preventDefault();
    setError('');
    if (!socket) return;

    socket.emit('authenticate', {
      username: usernameInput.trim(),
      password: password.trim(),
      isSignup: authMode === 'signup'
    }, (res) => {
      console.log('Auth response:', res);
      if (res.success) {
        setDisplayName(res.displayName);
        setAuthView(false);
        setUsernameInput('');
        setPassword('');
      } else {
        setError(res.error || 'Authentication failed');
      }
    });
  };

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInput(value);

    if (!socket || !displayName) return;

    if (value.trim()) {
      socket.emit('typing', true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', false);
      }, 2000);
    } else {
      socket.emit('typing', false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [socket, displayName]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || !currentDM) return;
    socket.emit('chatMessage', input.trim());
    setInput('');
    socket.emit('typing', false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const changeDisplayName = () => {
    if (!newDisplayName.trim() || !socket) return;
    socket.emit('changeDisplayName', newDisplayName.trim());
    setNewDisplayName('');
    setShowProfile(false);
  };

  const handleStartDM = (e) => {
    e.preventDefault();
    setDmError('');
    if (!dmUsername.trim() || !socket) return;
    socket.emit('startDM', dmUsername.trim(), (res) => {
      if (res && res.success) {
        setMessages(res.messages);
        setCurrentDM(res.dmKey);
        const otherName = res.dmKey.split(':').find((name) => name !== displayName);
        setActiveDMs((prev) => new Set([...prev, otherName]));
        setDmNames((prev) => new Map([...prev, [otherName, otherName]]));
        setDmUsername('');
        setShowStartDM(false);
      } else {
        setDmError(res?.error || 'Failed to start DM');
      }
    });
  };

  const formatRelativeTime = (ts) => {
    const timestamp = Number(ts);
    if (!timestamp || isNaN(timestamp) || !isFinite(timestamp)) {
      return '—';
    }

    const diffMs = Date.now() - timestamp;
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 30) return 'just now';
    if (seconds < 90) return '1 min ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (authView) {
    return (
      <div className="auth-overlay">
        <div className="auth-modal">
          <h2>{authMode === 'login' ? 'Sign In' : 'Sign Up'}</h2>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleAuth}>
            <input
              placeholder="Enter username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
            <button type="submit" className="btn primary">
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
          <div className="toggle">
            {authMode === 'login' ? (
              <button onClick={() => setAuthMode('signup')}>Create account</button>
            ) : (
              <button onClick={() => setAuthMode('login')}>Already have an account?</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-logo">
          <h2>Whismur</h2>
        </div>
        <div className="sidebar-header">
          <h3>Direct Messages</h3>
          <button className="btn-icon" onClick={() => setShowStartDM(true)} title="Start DM">
            +
          </button>
        </div>

        <div className="dms-list">
          {Array.from(activeDMs).map((dmUsername) => (
            <button
              key={dmUsername}
              className={`dm-item ${currentDM && currentDM.includes(dmUsername) ? 'active' : ''}`}
              onClick={() => {
                if (socket) {
                  socket.emit('startDM', dmUsername, (res) => {
                    if (res && res.success) {
                      setMessages(res.messages);
                      setCurrentDM(res.dmKey);
                    }
                  });
                }
              }}
            >
              @ {dmNames.get(dmUsername) || dmUsername}
            </button>
          ))}
        </div>
      </div>

      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      <div className="chat-container">
        <header className="header">
          <h1>{currentDM ? `@${dmNames.get(currentDM.split(':').find((name) => name !== displayName)) || 'Direct Message'}` : 'Whismur'}</h1>
          <div className="user">
            <span>{displayName}</span>
            <button className="profile-btn" onClick={() => setShowProfile(true)}>
              Profile
            </button>
          </div>
        </header>

        <main className="messages">
          {currentDM ? (
            messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.from === displayName ? 'own' : 'other'}`}
                >
                  <div className="sender">{msg.from}</div>
                  <div className="content">{msg.text}</div>
                  <div className="meta">
                    <time>{formatRelativeTime(msg.timestamp)}</time>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                No messages yet. Start the conversation!
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              Select a conversation to start messaging
            </div>
          )}

          {typingUsers.size > 0 && currentDM && (
            <div className="typing">
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        <form className="input-area" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={currentDM ? "Type a message..." : "Select a DM to start messaging..."}
            disabled={!currentDM}
          />
          <button type="submit" disabled={!input.trim() || !currentDM}>Send</button>
        </form>
      </div>

      {showProfile && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Profile</h2>
            <p>Display Name: <strong>{displayName}</strong></p>
            <input
              placeholder="New display name"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              minLength={3}
              maxLength={20}
            />
            <div className="modal-actions">
              <button onClick={() => setShowProfile(false)}>Cancel</button>
              <button className="primary" onClick={changeDisplayName} disabled={!newDisplayName.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartDM && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Start Direct Message</h2>
            {dmError && <div className="error">{dmError}</div>}
            <form onSubmit={handleStartDM}>
              <input
                placeholder="Username (e.g., Alice)"
                value={dmUsername}
                onChange={(e) => setDmUsername(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowStartDM(false);
                  setDmError('');
                }}>Cancel</button>
                <button className="primary" type="submit" disabled={!dmUsername.trim()}>
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;