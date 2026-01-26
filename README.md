# Whismur Chat

A cozy, real-time private messaging app inspired by the gentle vibe of Whismur (the pink whispering Pokémon).

Just two people, one quiet conversation.

## What it does

- Sign up or log in with a username + password
- Start direct messages with anyone
- See messages in real-time
- Know when someone is typing
- See when your messages have been read
- Change your display name whenever you want

## Features

- Private 1:1 chats only (no group rooms yet)
- Typing indicators
- Read receipts ("Seen by 2")
- Message timestamps ("just now", "5 min ago", etc.)
- Sidebar with your active conversations
- Profile modal to update your name

## Tech stack

- Frontend: React + Socket.io-client
- Backend: Node.js + Express + Socket.io
- In-memory storage (for now — restarts wipe everything)

## How to run locally

1. Backend
```bash
cd backend
npm install
node server.js
```
2. Frontend
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000 in two different tabs (or browsers) → sign up with different usernames → start chatting.

## Planned next steps

- Save messages & users in a real database
- Actually hash passwords (right now they're plain text — oops)
- Add a public chat room option
- Online status / user list
- Message reactions or emojis

### Created by Rounak.
