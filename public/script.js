const socket = io('jogo-da-velha-production-49cc.up.railway.app'); // Conecta ao servidor Socket.IO

const bigBoard = document.getElementById('big-board');
const currentPlayerDisplay = document.getElementById('current-player');
const message = document.getElementById('message');
const botModeCheckbox = document.getElementById('bot-mode');
const newGameButton = document.getElementById('new-game');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');

let currentPlayerRole = null; // Papel do jogador (X ou O)
let gameState = null; // Estado atual do jogo
let isBotMode = false; // Modo bot (opcional)

// Atualiza o modo do bot
botModeCheckbox.addEventListener('change', () => {
    isBotMode = botModeCheckbox.checked;
    console.log(`Modo Bot: ${isBotMode ? 'Ativado' : 'Desativado'}`);
});

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

// Função para verificar se há um vencedor em um tabuleiro menor
function checkSmallBoardWinner(smallBoard) {
    const cells = smallBoard.querySelectorAll('.cell');
    const winningCombinations = [
        [0, 1, 2], // Primeira linha
        [3, 4, 5], // Segunda linha
        [6, 7, 8], // Terceira linha
        [0, 3, 6], // Primeira coluna
        [1, 4, 7], // Segunda coluna
        [2, 5, 8], // Terceira coluna
        [0, 4, 8], // Diagonal principal
        [2, 4, 6]  // Diagonal secundária
    ];

    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (
            cells[a].textContent &&
            cells[a].textContent === cells[b].textContent &&
            cells[a].textContent === cells[c].textContent
        ) {
            return true; // Há um vencedor
        }
    }

    return false; // Não há vencedor
}

// Função para verificar se um tabuleiro menor está cheio
function isSmallBoardFull(smallBoard) {
    const cells = smallBoard.querySelectorAll('.cell');
    return Array.from(cells).every(cell => cell.textContent !== '');
}

// Função para desabilitar um tabuleiro menor
function disableSmallBoard(smallBoard) {
    const cells = smallBoard.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
        cell.style.pointerEvents = 'none';
    });
}

// Função para destacar o vencedor de um tabuleiro menor
function highlightWinner(smallBoard, winner) {
    smallBoard.classList.add(`winner-${winner}`);
}

// Função para verificar se há um vencedor no tabuleiro grande
function checkBigBoardWinner() {
    const winningCombinations = [
        [0, 1, 2], // Primeira linha
        [3, 4, 5], // Segunda linha
        [6, 7, 8], // Terceira linha
        [0, 3, 6], // Primeira coluna
        [1, 4, 7], // Segunda coluna
        [2, 5, 8], // Terceira coluna
        [0, 4, 8], // Diagonal principal
        [2, 4, 6]  // Diagonal secundária
    ];

    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (
            gameState.board[Math.floor(a / 3)][a % 3] &&
            gameState.board[Math.floor(a / 3)][a % 3] === gameState.board[Math.floor(b / 3)][b % 3] &&
            gameState.board[Math.floor(a / 3)][a % 3] === gameState.board[Math.floor(c / 3)][c % 3]
        ) {
            return true; // Há um vencedor
        }
    }

    return false; // Não há vencedor
}

// Função para desabilitar todos os tabuleiros
function disableAllBoards() {
    const smallBoards = document.querySelectorAll('.small-board');
    smallBoards.forEach(board => disableSmallBoard(board));
}

// Função para atualizar o destaque dos tabuleiros ativos
function updateActiveBoards() {
    const smallBoards = document.querySelectorAll('.small-board');
    smallBoards.forEach(board => {
        const row = parseInt(board.dataset.row);
        const col = parseInt(board.dataset.col);
        if (
            (gameState.nextBoardRow === null || (gameState.nextBoardRow === row && gameState.nextBoardCol === col)) &&
            gameState.board[row][col] === null
        ) {
            board.classList.add('active');
        } else {
            board.classList.remove('active');
        }
    });
}

// Função para lidar com o clique em uma célula
function handleCellClick(cell, smallBoard) {
    if (!gameState) {
        console.error("Estado do jogo não foi inicializado.");
        return;
    }

    if (isBotMode && currentPlayerRole === 'O') return; // Impede o jogador de clicar no turno do bot

    const boardRow = parseInt(smallBoard.dataset.row);
    const boardCol = parseInt(smallBoard.dataset.col);
    const cellRow = parseInt(cell.dataset.row);
    const cellCol = parseInt(cell.dataset.col);

    console.log("Célula clicada:", { row: boardRow, col: boardCol, cellRow, cellCol });

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

    // Se for o turno do bot, faz a jogada após 1 segundo
    if (isBotMode && currentPlayerRole === 'O' && state.currentPlayer === 'O') {
        console.log("Bot está pensando...");
        setTimeout(botMove, 1000); // Tempo reduzido para 1 segundo
    }
});

// Recebe o papel do jogador (X ou O)
socket.on('playerRole', (role) => {
    currentPlayerRole = role;
    message.textContent = `Você é o jogador ${role}`;
});

// Notifica que o jogo está cheio
socket.on('gameFull', () => {
    message.textContent = 'O jogo está cheio. Tente novamente mais tarde.';
});

// Notifica que um jogador desconectou
socket.on('playerDisconnected', (playerId) => {
    message.textContent = 'O outro jogador desconectou. O jogo será reiniciado.';
    setTimeout(() => location.reload(), 3000); // Recarrega a página após 3 segundos
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
                        // Verifica se board[row][col] e board[row][col][i] existem
                        if (board[row] && board[row][col] && board[row][col][i]) {
                            cell.textContent = board[row][col][i][j] || '';
                            cell.classList.remove('X', 'O');
                            if (board[row][col][i][j]) {
                                cell.classList.add(board[row][col][i][j]);
                            }
                        } else {
                            // Se não existir, define como vazio
                            cell.textContent = '';
                            cell.classList.remove('X', 'O');
                        }
                    }
                }
            }
        }
    }
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
            return gameState.board[row][col] === null && !isSmallBoardFull(board);
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
                if (checkSmallBoardWinner(b)) {
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
            if (checkSmallBoardWinner(board)) {
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
                if (checkSmallBoardWinner(board)) {
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

    // 3. Faz a jogada
    console.log(`Bot jogou na célula: [${bestCell.dataset.row}, ${bestCell.dataset.col}] do tabuleiro [${bestBoard.dataset.row}, ${bestBoard.dataset.col}]`);
    socket.emit('makeMove', {
        row: parseInt(bestBoard.dataset.row),
        col: parseInt(bestBoard.dataset.col),
        cellRow: parseInt(bestCell.dataset.row),
        cellCol: parseInt(bestCell.dataset.col),
    });
}

// Inicia o jogo
createBigBoard();
