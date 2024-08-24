document.addEventListener('DOMContentLoaded', () => {
    const demoContainer = document.getElementById('rule-demo');
    const nextCellButton = document.getElementById('next-cell');
    const resetButton = document.getElementById('reset');
    const cellExplanation = document.getElementById('cell-explanation');

    const gridSize = 5;
    let grid = [];
    let currentCell = { x: 0, y: 0 };

    function createGrid() {
        demoContainer.innerHTML = '';
        grid = [];
        for (let y = 0; y < gridSize; y++) {
            const row = [];
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => toggleCell(x, y));
                cell.addEventListener('mouseover', () => updateExplanation(x, y));
                cell.addEventListener('mouseout', () => updateExplanation(currentCell.x, currentCell.y));
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    toggleCell(x, y);
                    updateExplanation(x, y);
                });
                demoContainer.appendChild(cell);
                row.push(false);
            }
            grid.push(row);
        }
        currentCell = { x: 0, y: 0 };
        updateGrid();
        updateExplanation(currentCell.x, currentCell.y);
    }


    function toggleCell(x, y) {
        grid[y][x] = !grid[y][x];
        updateGrid();
        updateExplanation(currentCell.x, currentCell.y);
    }

    function updateGrid() {
        const cells = demoContainer.getElementsByClassName('cell');
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = cells[y * gridSize + x];
                cell.classList.toggle('alive', grid[y][x]);
                cell.classList.toggle('current', x === currentCell.x && y === currentCell.y);
            }
        }
    }

    function countNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + gridSize) % gridSize;
                const ny = (y + dy + gridSize) % gridSize;
                if (grid[ny][nx]) count++;
            }
        }
        return count;
    }

    function updateExplanation(x, y) {
        const isAlive = grid[y][x];
        const neighbors = countNeighbors(x, y);
        const willLive = isAlive ? (neighbors === 2 || neighbors === 3) : (neighbors === 3);

        let explanation = `セル(${x + 1}, ${y + 1})は現在${isAlive ? '生きて' : '死んで'}います。<br>`;
        explanation += `周囲の生きているセルの数: ${neighbors}<br>`;
        explanation += `次の世代では${willLive ? '生きます' : '死にます'}。<br>`;
        explanation += isAlive
            ? (willLive ? '周囲に2つか3つの生きたセルがあるため生存します。' : '周囲の生きたセルが少なすぎるか多すぎるため死亡します。')
            : (willLive ? '周囲にちょうど3つの生きたセルがあるため誕生します。' : '周囲の生きたセルが3つではないため、死んだままです。');

        cellExplanation.innerHTML = explanation;
    }

    function nextCell() {
        currentCell.x = (currentCell.x + 1) % gridSize;
        if (currentCell.x === 0) {
            currentCell.y = (currentCell.y + 1) % gridSize;
        }
        updateGrid();
        updateExplanation(currentCell.x, currentCell.y);
    }

    createGrid();

    nextCellButton.addEventListener('click', nextCell);
    resetButton.addEventListener('click', createGrid);
});