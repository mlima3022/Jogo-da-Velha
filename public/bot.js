const socket = io('jogo-da-velha-production-49cc.up.railway.app'); // Conecta ao servidor Socket.IO

const bigBoard = document.getElementById('big-board');
const currentPlayerDisplay = document.getElementById('current-player');
const message = document.getElementById('message');
const newGameButton = document.getElementById('new-game');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');

let currentPlayerRole = null; // Papel do jogador (X ou O)
let gameState = null; // Estado atual do jogo

// Escolha da sala (bot)
socket.emit('chooseRoom', 'bot');

// Novo jogo
newGameButton.addEventListener('click', () => {
    socket.emit('restartGame');
});

// Cria o tabuleiro grande
function createBigBoard() {
    bigBoard.innerHTML = '';
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const smallBoard = document.createElement('div');
            smallBoard.classList.add('small-board');
            smallBoard.dataset.row = row;
            smallBoard.dataset.col = col;

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const cell = document.createElement('div');
                    cell.classList.add('cell');
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.addEventListener('click', () => handleCellClick(cell, smallBoard));
                    smallBoard.appendChild(cell);
                }
            }

            bigBoard.appendChild(smallBoard);
        }
    }
}

// Função para lidar com o clique em uma célula
function handleCellClick(cell, smallBoard) {
    if (!gameState) {
        console.error("Estado do jogo não foi inicializado.");
        return;
    }

    const boardRow = parseInt(smallBoard.dataset.row);
    const boardCol = parseInt(smallBoard.dataset.col);
    const cellRow = parseInt(cell.dataset.row);
    const cellCol = parseInt(cell.dataset.col);

    // Verifica se o tabuleiro menor está ativo
    if (!isBoardActive(boardRow, boardCol)) {
        console.log("Este tabuleiro não está ativo.");
        return;
    }

    // Verifica se a célula já está ocupada
    if (gameState.board[boardRow][boardCol][cellRow][cellCol]) {
        console.log("Célula já ocupada.");
        return;
    }

    // Emite a jogada
    socket.emit('makeMove', { row: boardRow, col: boardCol, cellRow, cellCol });
}

// Verifica se um tabuleiro menor está ativo
function isBoardActive(row, col) {
    if (gameState.nextBoardRow === null && gameState.nextBoardCol === null) {
        return true; // Todos os tabuleiros estão ativos
    }
    return row === gameState.nextBoardRow && col === gameState.nextBoardCol;
}

// Verifica vitória em um tabuleiro menor (3x3)
function checkSmallBoardWin(board) {
    if (!board) return null;

    // Verifica linhas
    for (let i = 0; i < 3; i++) {
        if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return board[i][0]; // Retorna 'X' ou 'O' se houver vitória
        }
    }

    // Verifica colunas
    for (let j = 0; j < 3; j++) {
        if (board[0][j] && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
            return board[0][j]; // Retorna 'X' ou 'O' se houver vitória
        }
    }

    // Verifica diagonais
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return board[0][0]; // Retorna 'X' ou 'O' se houver vitória
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return board[0][2]; // Retorna 'X' ou 'O' se houver vitória
    }

    return null; // Retorna null se não houver vitória
}

// Verifica se um tabuleiro menor está cheio
function isSmallBoardFull(board) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (!board[i][j]) {
                return false; // Ainda há células vazias
            }
        }
    }
    return true; // Tabuleiro cheio
}

// Verifica vitória no tabuleiro maior (3x3 de tabuleiros menores)
function checkBigBoardWin(bigBoard) {
    // Cria uma matriz 3x3 para armazenar o vencedor de cada tabuleiro menor
    const winners = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ];

    // Preenche a matriz de vencedores
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            winners[row][col] = checkSmallBoardWin(bigBoard[row][col]);
        }
    }

    // Verifica vitória no tabuleiro maior usando a matriz de vencedores
    return checkSmallBoardWin(winners);
}

// Movimento do bot inteligente
function botMove() {
    console.log("Bot está jogando...");

    // 1. Encontra todos os tabuleiros ativos
    let activeBoards = [];
    if (gameState.nextBoardRow !== null && gameState.nextBoardCol !== null) {
        // Se houver um tabuleiro ativo específico, usa apenas ele
        const targetBoard = document.querySelector(
            `.small-board[data-row="${gameState.nextBoardRow}"][data-col="${gameState.nextBoardCol}"]`
        );
        activeBoards = [targetBoard];
        console.log(`Tabuleiro ativo: [${gameState.nextBoardRow}, ${gameState.nextBoardCol}]`);
    } else {
        // Se não houver tabuleiro ativo específico, usa todos os tabuleiros disponíveis
        activeBoards = Array.from(document.querySelectorAll('.small-board')).filter(board => {
            const row = parseInt(board.dataset.row);
            const col = parseInt(board.dataset.col);
            return !checkSmallBoardWin(gameState.board[row][col]) && !isSmallBoardFull(gameState.board[row][col]);
        });
        console.log("Bot escolheu entre todos os tabuleiros ativos.");
    }

    if (activeBoards.length === 0) {
        console.log("Nenhum tabuleiro disponível para o bot jogar.");
        return;
    }

    // 2. Heurística do bot
    let bestCell = null;
    let bestBoard = null;

    // Função para verificar se uma jogada é problemática
    function isProblematicMove(board, cell) {
        // Simula a jogada do bot
        cell.textContent = 'O';

        // Verifica se a jogada permite que o jogador X vença no próximo turno
        let allowsXToWin = false;
        for (const b of activeBoards) {
            const cells = Array.from(b.querySelectorAll('.cell:not(.X):not(.O)'));
            for (const c of cells) {
                c.textContent = 'X'; // Simula a jogada do jogador X
                if (checkSmallBoardWin(b)) {
                    allowsXToWin = true;
                    c.textContent = ''; // Desfaz a simulação
                    break;
                }
                c.textContent = ''; // Desfaz a simulação
            }
            if (allowsXToWin) break;
        }

        // Desfaz a simulação da jogada do bot
        cell.textContent = '';

        // Retorna true se a jogada for problemática
        return allowsXToWin;
    }

    // Prioridade 1: Bloquear o jogador X (se o jogador puder ganhar em algum tabuleiro ativo)
    for (const board of activeBoards) {
        const cells = Array.from(board.querySelectorAll('.cell:not(.X):not(.O)'));
        for (const cell of cells) {
            cell.textContent = 'X'; // Simula a jogada do jogador X
            if (checkSmallBoardWin(board)) {
                if (!isProblematicMove(board, cell)) {
                    bestCell = cell;
                    bestBoard = board;
                }
                cell.textContent = ''; // Desfaz a simulação
                break;
            }
            cell.textContent = ''; // Desfaz a simulação
        }
        if (bestCell) break; // Se encontrou uma jogada para bloquear, para de procurar
    }

    // Prioridade 2: Vencer (se o bot puder ganhar em algum tabuleiro ativo)
    if (!bestCell) {
        for (const board of activeBoards) {
            const cells = Array.from(board.querySelectorAll('.cell:not(.X):not(.O)'));
            for (const cell of cells) {
                cell.textContent = 'O'; // Simula a jogada do bot
                if (checkSmallBoardWin(board)) {
                    if (!isProblematicMove(board, cell)) {
                        bestCell = cell;
                        bestBoard = board;
                    }
                    cell.textContent = ''; // Desfaz a simulação
                    break;
                }
                cell.textContent = ''; // Desfaz a simulação
            }
            if (bestCell) break; // Se encontrou uma jogada vencedora, para de procurar
        }
    }

    // Prioridade 3: Jogar em uma célula segura (não problemática)
    if (!bestCell) {
        const availableMoves = [];
        for (const board of activeBoards) {
            const cells = Array.from(board.querySelectorAll('.cell:not(.X):not(.O)'));
            for (const cell of cells) {
                if (!isProblematicMove(board, cell)) {
                    availableMoves.push({ cell, board });
                }
            }
        }
        if (availableMoves.length > 0) {
            // Escolhe uma jogada aleatória entre as disponíveis
            const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            bestCell = randomMove.cell;
            bestBoard = randomMove.board;
        } else {
            // Se todas as jogadas forem problemáticas, escolhe a menos problemática
            const randomBoard = activeBoards[Math.floor(Math.random() * activeBoards.length)];
            const availableCells = Array.from(randomBoard.querySelectorAll('.cell:not(.X):not(.O)'));
            bestCell = availableCells[Math.floor(Math.random() * availableCells.length)];
            bestBoard = randomBoard;
        }
    }

    // 3. Faz a jogada do bot
    if (bestCell && bestBoard) {
        const boardRow = parseInt(bestBoard.dataset.row);
        const boardCol = parseInt(bestBoard.dataset.col);
        const cellRow = parseInt(bestCell.dataset.row);
        const cellCol = parseInt(bestCell.dataset.col);

        // Emite a jogada do bot
        socket.emit('makeMove', { row: boardRow, col: boardCol, cellRow, cellCol });
    }
}

// Recebe o estado do jogo do servidor
socket.on('gameState', (state) => {
    console.log("Estado do jogo recebido:", state);
    gameState = state;

    // Verifica vitória no tabuleiro menor
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const winner = checkSmallBoardWin(state.board[row][col]);
            if (winner) {
                // Marca o tabuleiro menor como vencido
                state.board[row][col] = winner; // Substitui o tabuleiro pelo vencedor ('X' ou 'O')
            }
        }
    }

    // Verifica vitória no tabuleiro maior
    const bigBoardWinner = checkBigBoardWin(state.board);
    if (bigBoardWinner) {
        message.textContent = `Jogador ${bigBoardWinner} venceu o jogo!`;
    }

    // Atualiza a interface
    updateBoard(state.board);
    currentPlayerDisplay.textContent = state.currentPlayer;
    updateActiveBoards(state.nextBoardRow, state.nextBoardCol);

    // Se for a vez do bot, faz uma jogada
    if (state.currentPlayer === 'O' && currentPlayerRole === 'X') {
        setTimeout(() => botMove(), 1000); // Bot faz uma jogada após 1 segundo
    }
});

// Recebe o papel do jogador (X ou O)
socket.on('playerRole', (role) => {
    currentPlayerRole = role;
    message.textContent = `Você é o jogador ${role}`;
});

// Atualiza o tabuleiro com base no estado do jogo
function updateBoard(board) {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const smallBoard = document.querySelector(`.small-board[data-row="${row}"][data-col="${col}"]`);
            if (smallBoard) {
                const cells = smallBoard.querySelectorAll('.cell');

                // Verifica se o tabuleiro menor foi vencido
                const winner = checkSmallBoardWin(board[row][col]);
                if (winner) {
                    // Marca o tabuleiro como vencido
                    smallBoard.classList.add(`winner-${winner}`);
                    // Bloqueia novas jogadas no tabuleiro menor
                    cells.forEach(cell => {
                        cell.removeEventListener('click', handleCellClick);
                    });
                } else {
                    smallBoard.classList.remove('winner-X', 'winner-O');
                }

                // Atualiza as células
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        const cell = cells[i * 3 + j];
                        if (board[row] && board[row][col] && board[row][col][i]) {
                            cell.textContent = board[row][col][i][j] || '';
                            cell.classList.remove('X', 'O');
                            if (board[row][col][i][j]) {
                                cell.classList.add(board[row][col][i][j]);
                            }
                        } else {
                            cell.textContent = '';
                            cell.classList.remove('X', 'O');
                        }
                    }
                }
            }
        }
    }
}

// Atualiza os tabuleiros ativos (com borda amarela)
function updateActiveBoards(nextBoardRow, nextBoardCol) {
    const smallBoards = document.querySelectorAll('.small-board');
    smallBoards.forEach((smallBoard) => {
        const row = parseInt(smallBoard.dataset.row);
        const col = parseInt(smallBoard.dataset.col);

        // Remove a borda amarela de todos os tabuleiros
        smallBoard.classList.remove('active-board');

        // Verifica se o tabuleiro está vencido
        const isBoardWon = checkSmallBoardWin(gameState.board[row][col]) !== null;

        // Se o próximo tabuleiro estiver vencido ou cheio, destaca todos os tabuleiros não vencidos
        if (nextBoardRow === null && nextBoardCol === null && !isBoardWon) {
            smallBoard.classList.add('active-board');
        } else if (nextBoardRow === row && nextBoardCol === col) {
            smallBoard.classList.add('active-board');
        }
    });
}

// Inicia o jogo
createBigBoard();
