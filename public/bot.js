const bigBoard = document.getElementById('big-board');
const currentPlayerDisplay = document.getElementById('current-player');
const message = document.getElementById('message');
const newGameButton = document.getElementById('new-game');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');

let currentPlayer = 'X';
let nextBoardRow = null;
let nextBoardCol = null;
let bigBoardState = Array.from({ length: 3 }, () => Array(3).fill(null));
let winsX = 0;
let winsO = 0;

// Novo jogo
newGameButton.addEventListener('click', resetGame);

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
            bigBoardState[Math.floor(a / 3)][a % 3] &&
            bigBoardState[Math.floor(a / 3)][a % 3] === bigBoardState[Math.floor(b / 3)][b % 3] &&
            bigBoardState[Math.floor(a / 3)][a % 3] === bigBoardState[Math.floor(c / 3)][c % 3]
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
            (nextBoardRow === null || (nextBoardRow === row && nextBoardCol === col)) &&
            bigBoardState[row][col] === null
        ) {
            board.classList.add('active');
        } else {
            board.classList.remove('active');
        }
    });
}

// Função para lidar com o clique em uma célula
function handleCellClick(cell, smallBoard) {
    if (currentPlayer === 'O') return; // Impede o jogador de clicar no turno do bot

    const boardRow = parseInt(smallBoard.dataset.row);
    const boardCol = parseInt(smallBoard.dataset.col);
    const cellRow = parseInt(cell.dataset.row);
    const cellCol = parseInt(cell.dataset.col);

    if (!cell.textContent && (nextBoardRow === null || (nextBoardRow === boardRow && nextBoardCol === boardCol))) {
        cell.textContent = currentPlayer;
        cell.classList.add(currentPlayer);

        // Verifica se há um vencedor no tabuleiro menor
        if (checkSmallBoardWinner(smallBoard)) {
            bigBoardState[boardRow][boardCol] = currentPlayer;
            disableSmallBoard(smallBoard);
            highlightWinner(smallBoard, currentPlayer);

            // Verifica se há um vencedor no tabuleiro grande
            if (checkBigBoardWinner()) {
                message.textContent = `Jogador ${currentPlayer} venceu o jogo!`;
                updateScore(currentPlayer);
                disableAllBoards();
                return;
            }
        } else if (isSmallBoardFull(smallBoard)) {
            bigBoardState[boardRow][boardCol] = 'draw';
        }

        // Define o próximo tabuleiro com base na célula clicada
        nextBoardRow = cellRow;
        nextBoardCol = cellCol;

        // Verifica se o próximo tabuleiro está completo ou inativo
        const nextBoard = document.querySelector(`.small-board[data-row="${nextBoardRow}"][data-col="${nextBoardCol}"]`);
        if (nextBoard && (bigBoardState[nextBoardRow][nextBoardCol] !== null || isSmallBoardFull(nextBoard))) {
            nextBoardRow = null;
            nextBoardCol = null;
        }

        // Alterna o jogador
        currentPlayer = 'O'; // Próximo turno é do bot
        currentPlayerDisplay.textContent = currentPlayer;

        // Atualiza o destaque dos tabuleiros ativos
        updateActiveBoards();

        // O bot faz a jogada após 1 segundo
        setTimeout(botMove, 1000);
    }
}

// Movimento do bot inteligente
function botMove() {
    console.log("Bot está jogando...");

    // 1. Encontra todos os tabuleiros ativos
    let activeBoards = [];
    if (nextBoardRow !== null && nextBoardCol !== null) {
        // Se houver um tabuleiro ativo específico, usa apenas ele
        const targetBoard = document.querySelector(
            `.small-board[data-row="${nextBoardRow}"][data-col="${nextBoardCol}"]`
        );
        activeBoards = [targetBoard];
        console.log(`Tabuleiro ativo: [${nextBoardRow}, ${nextBoardCol}]`);
    } else {
        // Se não houver tabuleiro ativo específico, usa todos os tabuleiros disponíveis
        activeBoards = Array.from(document.querySelectorAll('.small-board')).filter(board => {
            const row = parseInt(board.dataset.row);
            const col = parseInt(board.dataset.col);
            return bigBoardState[row][col] === null && !isSmallBoardFull(board);
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
    bestCell.textContent = currentPlayer;
    bestCell.classList.add(currentPlayer);

    // Verifica se há um vencedor no tabuleiro menor
    if (checkSmallBoardWinner(bestBoard)) {
        const boardRow = parseInt(bestBoard.dataset.row);
        const boardCol = parseInt(bestBoard.dataset.col);
        bigBoardState[boardRow][boardCol] = currentPlayer;
        disableSmallBoard(bestBoard);
        highlightWinner(bestBoard, currentPlayer);

        // Verifica se há um vencedor no tabuleiro grande
        if (checkBigBoardWinner()) {
            message.textContent = `Jogador ${currentPlayer} venceu o jogo!`;
            updateScore(currentPlayer);
            disableAllBoards();
            return;
        }
    } else if (isSmallBoardFull(bestBoard)) {
        const boardRow = parseInt(bestBoard.dataset.row);
        const boardCol = parseInt(bestBoard.dataset.col);
        bigBoardState[boardRow][boardCol] = 'draw';
    }

    // Define o próximo tabuleiro com base na célula clicada
    nextBoardRow = parseInt(bestCell.dataset.row);
    nextBoardCol = parseInt(bestCell.dataset.col);

    // Verifica se o próximo tabuleiro está completo ou inativo
    const nextBoard = document.querySelector(`.small-board[data-row="${nextBoardRow}"][data-col="${nextBoardCol}"]`);
    if (nextBoard && (bigBoardState[nextBoardRow][nextBoardCol] !== null || isSmallBoardFull(nextBoard))) {
        nextBoardRow = null;
        nextBoardCol = null;
    }

    // Alterna o jogador
    currentPlayer = 'X'; // Próximo turno é do jogador
    currentPlayerDisplay.textContent = currentPlayer;

    // Atualiza o destaque dos tabuleiros ativos
    updateActiveBoards();
}

// Atualiza o placar
function updateScore(winner) {
    if (winner === 'X') {
        winsX++;
        scoreX.textContent = winsX;
    } else if (winner === 'O') {
        winsO++;
        scoreO.textContent = winsO;
    }
}

// Reinicia o jogo
function resetGame() {
    bigBoardState = Array.from({ length: 3 }, () => Array(3).fill(null));
    currentPlayer = 'X';
    nextBoardRow = null;
    nextBoardCol = null;
    message.textContent = '';
    createBigBoard();
    updateActiveBoards();
}

// Inicia o jogo
createBigBoard();
