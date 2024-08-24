const gridSize = 20;
let cells = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
let isRunning = false;
let generation = 0;
let intervalId;

const gridElement = document.getElementById('grid');
const playPauseButton = document.getElementById('playPause');
const randomizeButton = document.getElementById('randomize');
const generationElement = document.getElementById('generation');

function createGrid() {
    gridElement.innerHTML = '';
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.addEventListener('click', () => toggleCell(i, j));
            gridElement.appendChild(cell);
        }
    }
}

function updateGrid() {
    const cellElements = gridElement.getElementsByClassName('cell');
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            cellElements[i * gridSize + j].classList.toggle('alive', cells[i][j]);
        }
    }
}

function toggleCell(i, j) {
    cells[i][j] = !cells[i][j];
    updateGrid();
}

function randomizeCells() {
    cells = cells.map(row => row.map(() => Math.random() > 0.7));
    updateGrid();
    generation = 0;
    generationElement.textContent = generation;
}

function countNeighbors(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const newRow = (row + i + gridSize) % gridSize;
            const newCol = (col + j + gridSize) % gridSize;
            if (cells[newRow][newCol]) count++;
        }
    }
    return count;
}

function nextGeneration() {
    const newCells = cells.map((row, i) =>
        row.map((cell, j) => {
            const neighbors = countNeighbors(i, j);
            return neighbors === 3 || (cell && neighbors === 2);
        })
    );
    cells = newCells;
    updateGrid();
    generation++;
    generationElement.textContent = generation;
}

function toggleSimulation() {
    isRunning = !isRunning;
    playPauseButton.textContent = isRunning ? '一時停止' : '再生';
    if (isRunning) {
        intervalId = setInterval(nextGeneration, 200);
    } else {
        clearInterval(intervalId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createGrid();
    updateGrid();

    playPauseButton.addEventListener('click', toggleSimulation);
    randomizeButton.addEventListener('click', randomizeCells);
});

function updateGridSize() {
    const gridElement = document.getElementById('grid') || document.getElementById('customGrid');
    if (!gridElement) return;
    
    const isMobile = window.innerWidth <= 600;
    const size = isMobile ? 10 : 20;
    
    gridElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    
    // グリッドサイズが変更された場合、cellsの配列も更新
    if (size !== gridSize) {
        cells = Array(size).fill().map(() => Array(size).fill(false));
        gridSize = size;
        createGrid(); // グリッドを再作成
        updateGrid(); // グリッドを更新
    }
}

// ウィンドウサイズが変更された時にグリッドサイズを更新
window.addEventListener('resize', updateGridSize);

// 初期化時にもグリッドサイズを設定
document.addEventListener('DOMContentLoaded', () => {
    updateGridSize();
    createGrid();
    updateGrid();
    
    // ここに既存の初期化コード（ボタンのイベントリスナーの設定など）を追加
});