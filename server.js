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
