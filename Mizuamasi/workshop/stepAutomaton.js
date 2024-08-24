document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('step-automaton');
    const stepButton = document.getElementById('next-step');
    const resetButton = document.getElementById('reset');
    const cellInfo = document.getElementById('cell-info');

    const gridSize = 8;
    let cells = [];

    function createGrid() {
        grid.innerHTML = '';
        grid.style.setProperty('--grid-size', gridSize);
        cells = [];
        for (let i = 0; i < gridSize; i++) {
            cells[i] = [];
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.addEventListener('click', () => toggleCell(i, j));
                cell.addEventListener('mouseover', () => showCellInfo(i, j));
                cell.addEventListener('mouseout', () => cellInfo.innerHTML = '');
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    toggleCell(i, j);
                    showCellInfo(i, j);
                });
                grid.appendChild(cell);
                cells[i][j] = false;
            }
        }
    }

    function toggleCell(i, j) {
        cells[i][j] = !cells[i][j];
        updateGrid();
        showCellInfo(i, j);
    }

    function updateGrid() {
        const cellElements = grid.getElementsByClassName('cell');
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                cellElements[i * gridSize + j].classList.toggle('alive', cells[i][j]);
            }
        }
    }

    function showCellInfo(i, j) {
        const isAlive = cells[i][j];
        const neighbors = countNeighbors(i, j);
        const willLive = neighbors === 3 || (isAlive && neighbors === 2);
        let info = `セル(${i+1}, ${j+1}): 現在${isAlive ? '生' : '死'}, 隣接する生きたセル: ${neighbors}<br>`;
        info += `次の世代: ${willLive ? '生存' : '死亡'} - `;
        if (isAlive) {
            info += willLive ? '周囲に2つか3つの生きたセルがあるため生存' : '周囲の生きたセルが少なすぎるか多すぎるため死亡';
        } else {
            info += willLive ? '周囲にちょうど3つの生きたセルがあるため誕生' : '周囲の生きたセルが3つではないため、死んだまま';
        }
        cellInfo.innerHTML = info;
    }

    function countNeighbors(i, j) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                const ni = (i + di + gridSize) % gridSize;
                const nj = (j + dj + gridSize) % gridSize;
                if (cells[ni][nj]) count++;
            }
        }
        return count;
    }

    function step() {
        const newCells = cells.map(row => [...row]);
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const neighbors = countNeighbors(i, j);
                newCells[i][j] = neighbors === 3 || (cells[i][j] && neighbors === 2);
            }
        }
        cells = newCells;
        updateGrid();
    }

    createGrid();

    stepButton.addEventListener('click', step);
    resetButton.addEventListener('click', () => {
        createGrid();
        updateGrid();
        cellInfo.innerHTML = '';
    });
});