const gridSize = 20;
let cells = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
let isRunning = false;
let generation = 0;

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

function countNe