const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, "http://localhost:3000"] : ["http://localhost:3000"];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

const users = new Map();

const usersByDisplayName = new Map();

const privateMessages = new Map();

const seenBy = new Map();

const userContexts = new Map();

let messageCounter = 0;

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('authenticate', ({ username, password, isSignup }, callback) => {
    if (!username || username.length < 3 || username.length > 20) {
      return callback({ success: false, error: 'Username must be 3–20 characters' });
    }
    if (!password || password.length < 4) {
      return callback({ success: false, error: 'Password too short' });
    }

    const norm = username.toLowerCase();

    if (isSignup) {
      if (users.has(norm)) return callback({ success: false, error: 'Username taken' });
      users.set(norm, { displayName: username, password, socketId: socket.id });
      usersByDisplayName.set(username, norm);
      socket.displayName = username;
      socket.userKey = norm;
      console.log('New user signup:', username);
      callback({ success: true, displayName: username });
    } else {
      const user = users.get(norm);
      if (!user || user.password !== password) return callback({ success: false, error: 'Invalid credentials' });
      user.socketId = socket.id;
      socket.displayName = user.displayName;
      socket.userKey = norm;
      console.log('User login:', username);
      callback({ success: true, displayName: user.displayName });
    }

    userContexts.set(socket.id, { type: 'dm', target: null });
  });

  socket.use((packet, next) => {
    if (packet[0] === 'authenticate') return next();
    if (!socket.displayName) return next(new Error('Not authenticated'));
    next();
  });

  socket.on('typing', (isTyping) => {
    if (!socket.displayName) return;
    socket.broadcast.emit('typing', { user: socket.displayName, isTyping });
  });

  socket.on('chatMessage', (text) => {
    if (!text?.trim()) return;
    const context = userContexts.get(socket.id) || { type: 'dm', target: null };
    const now = Date.now();
    const msgId = ++messageCounter;

    if (context.type === 'dm' && context.target) {
      const dmKey = context.target;
      const msg = {
        id: msgId,
        from: socket.displayName,
        text: text.trim(),
        timestamp: now,
        dm: dmKey
      };
      if (!privateMessages.has(dmKey)) {
        privateMessages.set(dmKey, []);
      }
      privateMessages.get(dmKey).push(msg);
      
      const [displayName1, displayName2] = dmKey.split(':');
      const targetDisplayName = displayName1 === socket.displayName ? displayName2 : displayName1;
      const targetUserKey = usersByDisplayName.get(targetDisplayName);
      const targetUserData = users.get(targetUserKey);
      if (targetUserData && targetUserData.socketId) {
        io.to(targetUserData.socketId).emit('privateMessage', msg);
      }
      socket.emit('privateMessage', msg);
      seenBy.set(msgId, new Set([socket.displayName]));
    }
  });

  socket.on('startDM', (targetDisplayName, callback) => {
    if (!socket.displayName) return;
    if (!usersByDisplayName.has(targetDisplayName)) {
      return callback({ success: false, error: 'User not found' });
    }
    if (targetDisplayName === socket.displayName) {
      return callback({ success: false, error: 'Cannot DM yourself' });
    }
    
    const dmKey = [socket.displayName, targetDisplayName].sort().join(':');
    if (!privateMessages.has(dmKey)) {
      privateMessages.set(dmKey, []);
    }
    
    userContexts.set(socket.id, { type: 'dm', target: dmKey });
    const messages = privateMessages.get(dmKey) || [];
    callback({ 
      success: true, 
      dmKey, 
      messages,
      targetDisplayName: targetDisplayName 
    });
  });

  socket.on('seen', ({ messageId }) => {
    if (!socket.displayName || !seenBy.has(messageId)) return;
    const viewers = seenBy.get(messageId);
    viewers.add(socket.displayName);
    io.emit('messageSeenUpdate', { messageId, count: viewers.size });
  });

  socket.on('changeDisplayName', (newName) => {
    if (!newName || newName.length < 3 || newName.length > 20) return;
    if (!socket.userKey) return;

    const user = users.get(socket.userKey);
    if (user) {
      const oldName = user.displayName;
      user.displayName = newName;
      socket.displayName = newName;

      socket.emit('yourDisplayName', newName);
    }
  });

  socket.on('disconnect', () => {
    userContexts.delete(socket.id);
  });
});

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));