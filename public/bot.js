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

    if (!cell.textContent && (gameState.nextBoardRow === null || (gameState.nextBoardRow === boardRow && gameState.nextBoardCol === boardCol))) {
        socket.emit('makeMove', { row: boardRow, col: boardCol, cellRow, cellCol });
    } else {
        console.log("Jogada inválida: célula já preenchida ou tabuleiro errado.");
    }
}

// Recebe o estado do jogo do servidor
socket.on('gameState', (state) => {
    console.log("Estado do jogo recebido:", state);
    gameState = state;
    updateBoard(state.board);
    currentPlayerDisplay.textContent = state.currentPlayer;
    updateActiveBoards();
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

// Inicia o jogo
createBigBoard();
