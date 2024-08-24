const gridSize = 20;
let cells = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
let isRunning = false;
let generation = 0;
let intervalId;

let surviveRule = [2, 3];
let birthRule = [3];

function initializeElements() {
    const gridElement = document.getElementById('custom-grid');
    const applyRulesButton = document.getElementById('apply-rules');
    const stepButton = document.getElementById('step');
    const playPauseButton = document.getElementById('play-pause');
    const resetButton = document.getElementById('reset');
    const generationElement = document.getElementById('generation-count');
    const surviveRuleInput = document.getElementById('survive-rule');
    const birthRuleInput = document.getElementById('birth-rule');
    const ruleExplanation = document.getElementById('rule-explanation');

    return {
        gridElement, applyRulesButton, stepButton, playPauseButton, resetButton,
        generationElement, surviveRuleInput, birthRuleInput, ruleExplanation
    };
}

function createGrid(gridElement) {
    gridElement.innerHTML = '';
    gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.addEventListener('click', () => toggleCell(i, j));
            gridElement.appendChild(cell);
        }
    }
}

function updateGrid(gridElement) {
    const cellElements = gridElement.children;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            cellElements[i * gridSize + j].classList.toggle('alive', cells[i][j]);
        }
    }
}

function toggleCell(i, j) {
    cells[i][j] = !cells[i][j];
    updateGrid(document.getElementById('custom-grid'));
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
            if (cell) {
                return surviveRule.includes(neighbors);
            } else {
                return birthRule.includes(neighbors);
            }
        })
    );
    cells = newCells;
    generation++;
    updateGrid(document.getElementById('custom-grid'));
    document.getElementById('generation-count').textContent = `世代: ${generation}`;
}

function toggleSimulation() {
    isRunning = !isRunning;
    const playPauseButton = document.getElementById('play-pause');
    playPauseButton.textContent = isRunning ? '一時停止' : '再生';
    if (isRunning) {
        intervalId = setInterval(nextGeneration, 200);
    } else {
        clearInterval(intervalId);
    }
}

function resetSimulation() {
    clearInterval(intervalId);
    isRunning = false;
    generation = 0;
    cells = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
    updateGrid(document.getElementById('custom-grid'));
    document.getElementById('generation-count').textContent = `世代: ${generation}`;
    document.getElementById('play-pause').textContent = '再生';
}

function applyRules() {
    const surviveRuleInput = document.getElementById('survive-rule');
    const birthRuleInput = document.getElementById('birth-rule');
    surviveRule = surviveRuleInput.value.split(',').map(Number);
    birthRule = birthRuleInput.value.split(',').map(Number);
    updateRuleExplanation();
}

function updateRuleExplanation() {
    const ruleExplanation = document.getElementById('rule-explanation');
    ruleExplanation.innerHTML = `
        <h4>現在のルール：</h4>
        <p>生存ルール：周囲に${surviveRule.join('個か')}個の生きているセルがあれば生き続けます。</p>
        <p>誕生ルール：死んでいるセルの周囲に${birthRule.join('個か')}個の生きているセルがあれば次の世代で生まれます。</p>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = initializeElements();
    createGrid(elements.gridElement);
    updateGrid(elements.gridElement);
    updateRuleExplanation();

    elements.applyRulesButton.addEventListener('click', applyRules);
    elements.stepButton.addEventListener('click', nextGeneration);
    elements.playPauseButton.addEventListener('click', toggleSimulation);
    elements.resetButton.addEventListener('click', resetSimulation);
});