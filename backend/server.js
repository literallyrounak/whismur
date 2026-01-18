const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const users = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  const username = `User_${socket.id.slice(0, 5)}`;
  users[socket.id] = username;

  socket.emit('assignUsername', username);

  io.emit('chatMessage', {
    username: 'System',
    text: `${username} has joined the chat`
  });

  socket.on('chatMessage', (message) => {
    io.emit('chatMessage', {
      username: users[socket.id],
      text: message
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const username = users[socket.id];
    delete users[socket.id];

  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});