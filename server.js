const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configura o Socket.IO com CORS
const io = new Server(server, {
  cors: {
    origin: 'https://jogo-da-velha-production-49cc.up.railway.app', // Permite conexões apenas do frontend especificado
    methods: ['GET', 'POST'],
  },
});

// Serve os arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Estado das salas multiplayer
const rooms = new Map(); // Mapa de salas: { roomId: gameState }

// Estado das salas do bot
const botRooms = new Map(); // Mapa de salas do bot: { botRoomId: gameState }

// Gerenciamento de conexões
io.on('connection', (socket) => {
  console.log(`Novo jogador conectado: ${socket.id}`);

  // Escolha da sala (multiplayer ou bot)
  socket.on('chooseRoom', (room) => {
    if (room === 'multiplayer') {
      // Cria ou entra em uma sala multiplayer
      handleMultiplayerRoom(socket);
    } else if (room === 'bot') {
      // Cria uma nova sala do bot
      handleBotRoom(socket);
    }
  });
});

// Lógica da sala multiplayer
function handleMultiplayerRoom(socket) {
  // Encontra uma sala disponível ou cria uma nova
  let roomId = findAvailableRoom();
  if (!roomId) {
    roomId = `sala${rooms.size + 1}`; // Cria uma nova sala
rooms.set(roomId, {
  players: {},
  board: Array.from({ length: 3 }, () => 
    Array.from({ length: 3 }, () => 
      Array.from({ length: 3 }, () => 
        Array(3).fill(null)
      )
    )
  ),
  currentPlayer: 'X', // Linha 61 corrigida
  nextBoardRow: null,
  nextBoardCol: null,
});

  // Entra na sala
  socket.join(roomId);
  console.log(`Jogador ${socket.id} entrou na sala ${roomId}`);

  // Adiciona o jogador ao estado da sala
  const roomState = rooms.get(roomId);
  if (Object.keys(roomState.players).length < 2) {
    roomState.players[socket.id] = Object.keys(roomState.players).length === 0 ? 'X' : 'O';
    socket.emit('playerRole', roomState.players[socket.id]); // Informa ao jogador seu papel (X ou O)
    socket.emit('roomAssigned', roomId); // Informa ao jogador a sala em que ele está
  } else {
    socket.emit('gameFull'); // Informa que o jogo está cheio
    socket.disconnect();
    return;
  }

  // Envia o estado inicial do jogo para o novo jogador
  socket.emit('gameState', roomState);

  // Atualiza o estado do jogo quando um jogador faz uma jogada
  socket.on('makeMove', (move) => {
    const { row, col, cellRow, cellCol } = move;

    // Verifica se a jogada é válida
    if (
      roomState.board[row] &&
      roomState.board[row][col] &&
      roomState.board[row][col][cellRow] &&
      roomState.board[row][col][cellRow][cellCol] === null &&
      roomState.players[socket.id] === roomState.currentPlayer
    ) {
      roomState.board[row][col][cellRow][cellCol] = roomState.currentPlayer;
      roomState.currentPlayer = roomState.currentPlayer === 'X' ? 'O' : 'X'; // Alterna o jogador
      roomState.nextBoardRow = cellRow;
      roomState.nextBoardCol = cellCol;
      io.to(roomId).emit('gameState', roomState); // Envia o novo estado para todos na sala
    } else {
      console.log("Jogada inválida:", move); // Debug
    }
  });

  // Remove o jogador quando ele desconecta
  socket.on('disconnect', () => {
    console.log(`Jogador ${socket.id} desconectado da sala ${roomId}`);
    delete roomState.players[socket.id];
    io.to(roomId).emit('playerDisconnected', socket.id);

    // Se a sala ficar vazia, remove a sala
    if (Object.keys(roomState.players).length === 0) {
      rooms.delete(roomId);
      console.log(`Sala ${roomId} removida.`);
    }
  });
}

// Lógica da sala do bot
function handleBotRoom(socket) {
  // Cria uma nova sala do bot
  const botRoomId = `bot-sala${botRooms.size + 1}`;
  const botGameState = {
    players: { [socket.id]: 'X' }, // O jogador local sempre será 'X'
    board: Array.from({ length: 3 }, () => 
      Array.from({ length: 3 }, () => 
        Array.from({ length: 3 }, () => 
          Array(3).fill(null)
        )
      ),
    currentPlayer: 'X',
    nextBoardRow: null,
    nextBoardCol: null,
  };

  // Adiciona a sala do bot ao mapa
  botRooms.set(botRoomId, botGameState);

  // Entra na sala do bot
  socket.join(botRoomId);
  console.log(`Jogador ${socket.id} entrou na sala do bot ${botRoomId}`);

  // Envia o estado atual do jogo para o jogador
  socket.emit('gameState', botGameState);

  // Atualiza o estado do jogo quando o jogador faz uma jogada
  socket.on('makeMove', (move) => {
    const { row, col, cellRow, cellCol } = move;

    // Verifica se a jogada é válida
    if (
      botGameState.board[row] &&
      botGameState.board[row][col] &&
      botGameState.board[row][col][cellRow] &&
      botGameState.board[row][col][cellRow][cellCol] === null &&
      botGameState.players[socket.id] === botGameState.currentPlayer
    ) {
      botGameState.board[row][col][cellRow][cellCol] = botGameState.currentPlayer;
      botGameState.currentPlayer = botGameState.currentPlayer === 'X' ? 'O' : 'X'; // Alterna o jogador
      botGameState.nextBoardRow = cellRow;
      botGameState.nextBoardCol = cellCol;
      socket.emit('gameState', botGameState); // Envia o novo estado para o jogador

      // Se for a vez do bot, faz uma jogada
      if (botGameState.currentPlayer === 'O') {
        setTimeout(() => botMove(socket, botRoomId), 1000); // Bot faz uma jogada após 1 segundo
      }
    } else {
      console.log("Jogada inválida:", move); // Debug
    }
  });

  // Remove o jogador quando ele desconecta
  socket.on('disconnect', () => {
    console.log(`Jogador ${socket.id} desconectado da sala do bot ${botRoomId}`);
    delete botGameState.players[socket.id];
    botRooms.delete(botRoomId); // Remove a sala do bot
  });
}

// Movimento do bot
function botMove(socket, botRoomId) {
  const botGameState = botRooms.get(botRoomId);
  if (!botGameState) return; // Verifica se a sala do bot ainda existe

  console.log("Bot está jogando...");

  // 1. Encontra todos os tabuleiros ativos
  let activeBoards = [];
  if (botGameState.nextBoardRow !== null && botGameState.nextBoardCol !== null) {
    // Se houver um tabuleiro ativo específico, usa apenas ele
    activeBoards = [[botGameState.nextBoardRow, botGameState.nextBoardCol]];
  } else {
    // Se não houver tabuleiro ativo específico, usa todos os tabuleiros disponíveis
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (botGameState.board[row][col] === null) {
          activeBoards.push([row, col]);
        }
      }
    }
  }

  if (activeBoards.length === 0) {
    console.log("Nenhum tabuleiro disponível para o bot jogar.");
    return;
  }

  // 2. Escolhe uma jogada aleatória
  const [boardRow, boardCol] = activeBoards[Math.floor(Math.random() * activeBoards.length)];
  const cellRow = Math.floor(Math.random() * 3);
  const cellCol = Math.floor(Math.random() * 3);

  // 3. Faz a jogada
  if (botGameState.board[boardRow][boardCol][cellRow][cellCol] === null) {
    botGameState.board[boardRow][boardCol][cellRow][cellCol] = 'O';
    botGameState.currentPlayer = 'X'; // Alterna para o jogador
    botGameState.nextBoardRow = cellRow;
    botGameState.nextBoardCol = cellCol;
    socket.emit('gameState', botGameState); // Envia o novo estado para o jogador
  } else {
    // Se a jogada for inválida, tenta novamente
    botMove(socket, botRoomId);
  }
}

// Função para encontrar uma sala disponível (multiplayer)
function findAvailableRoom() {
  for (const [roomId, roomState] of rooms) {
    if (Object.keys(roomState.players).length < 2) {
      return roomId; // Retorna a primeira sala com vaga
    }
  }
  return null; // Nenhuma sala disponível
}

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
