const customGridSize = 20;
let customCells = Array(customGridSize).fill().map(() => Array(customGridSize).fill(false));
let customIsRunning = false;
let customGeneration = 0;
let customIntervalId;
let surviveRule = [2, 3];
let birthRule = [3];

let customGridElement, customPlayPauseButton, customRandomizeButton, customGenerationElement, surviveRuleInput, birthRuleInput, applyRulesButton;

function initializeElements() {
    customGridElement = document.getElementById('customGrid');
    customPlayPauseButton = document.getElementById('customPlayPause');
    customRandomizeButton = document.getElementById('customRandomize');
    customGenerationElement = document.getElementById('customGeneration');
    surviveRuleInput = document.getElementById('surviveRule');
    birthRuleInput = document.getElementById('birthRule');
    applyRulesButton = document.getElementById('applyRules');
}

function createCustomGrid() {
    if (!customGridElement) return;
    customGridElement.innerHTML = '';
    for (let i = 0; i < customGridSize; i++) {
        for (let j = 0; j < customGridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.addEventListener('click', () => toggleCustomCell(i, j));
            customGridElement.appendChild(cell);
        }
    }
}

function updateCustomGrid() {
    if (!customGridElement) return;
    const cellElements = customGridElement.getElementsByClassName('cell');
    for (let i = 0; i < customGridSize; i++) {
        for (let j = 0; j < customGridSize; j++) {
            cellElements[i * customGridSize + j].classList.toggle('alive', customCells[i][j]);
        }
    }
}

function toggleCustomCell(i, j) {
    customCells[i][j] = !customCells[i][j];
    updateCustomGrid();
}

function randomizeCustomCells() {
    customCells = customCells.map(row => row.map(() => Math.random() > 0.7));
    updateCustomGrid();
    customGeneration = 0;
    if (customGenerationElement) customGenerationElement.textContent = customGeneration;
}

function countCustomNeighbors(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const newRow = (row + i + customGridSize) % customGridSize;
            const newCol = (col + j + customGridSize) % customGridSize;
            if (customCells[newRow][newCol]) count++;
        }
    }
    return count;
}

function nextCustomGeneration() {
    const newCells = customCells.map((row, i) =>
        row.map((cell, j) => {
            const neighbors = countCustomNeighbors(i, j);
            if (cell) {
                return surviveRule.includes(neighbors);
            } else {
                return birthRule.includes(neighbors);
            }
        })
    );
    customCells = newCells;
    updateCustomGrid();
    customGeneration++;
    if (customGenerationElement) customGenerationElement.textContent = customGeneration;
}

function toggleCustomSimulation() {
    customIsRunning = !customIsRunning;
    if (customPlayPauseButton) customPlayPauseButton.textContent = customIsRunning ? '一時停止' : '再生';
    if (customIsRunning) {
        customIntervalId = setInterval(nextCustomGeneration, 200);
    } else {
        clearInterval(customIntervalId);
    }
}

function applyCustomRules() {
    if (surviveRuleInput && birthRuleInput) {
        surviveRule = surviveRuleInput.value.split('').map(Number);
        birthRule = birthRuleInput.value.split('').map(Number);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    createCustomGrid();
    updateCustomGrid();

    if (customPlayPauseButton) customPlayPauseButton.addEventListener('click', toggleCustomSimulation);
    if (customRandomizeButton) customRandomizeButton.addEventListener('click', randomizeCustomCells);
    if (applyRulesButton) applyRulesButton.addEventListener('click', applyCustomRules);
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