const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve files from the root folder (where server.js lives)
app.use(express.static(__dirname));

app.get('/healthz', (req, res) => res.status(200).send('OK'));

const players = {};

io.on('connection', (socket) => {
  // Create a new player entry
  players[socket.id] = { 
    x: 132, y: 0, z: 132, 
    rotY: -1.57, 
    carClass: 'm5', 
    color: 0xff3b30 
  };

  // Send the current players to the new player
  socket.emit('currentPlayers', players);

  // Tell everyone else about the new player
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

  // Handle movement
  socket.on('playerMovement', (data) => {
    if (!players[socket.id]) return;
    players[socket.id] = { ...players[socket.id], ...data };
    socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('Server running on port ' + PORT));
