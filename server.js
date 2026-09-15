const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthz', (req, res) => res.status(200).send('OK'));

const players = {};

io.on('connection', (socket) => {
  players[socket.id] = { x: 132, y: 0, z: 132, rotY: -1.57, carClass: 'm5', color: 0xff3b30 };
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

  socket.on('playerMovement', (data) => {
    if (!players[socket.id]) return;
    players[socket.id] = { ...players[socket.id], ...data };
    socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('Server running on port ' + PORT));
