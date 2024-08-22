document.addEventListener('DOMContentLoaded', () => {
    const demoContainer = document.getElementById('automaton-demo');
    const gridSize = 50;
    let grid = createGrid(gridSize);

    function createGrid(size) {
        return Array(size).fill().map(() => Array(size).fill(false));
    }

    function renderGrid() {
        demoContainer.innerHTML = '';
        const table = document.createElement('table');
        for (let i = 0; i < gridSize; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('td');
                cell.classList.toggle('alive', grid[i][j]);
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
        demoContainer.appendChild(table);
    }

    function updateGrid() {
        const newGrid = createGrid(gridSize);
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const neighbors = countNeighbors(i, j);
                newGrid[i][j] = grid[i][j] ? (neighbors === 2 || neighbors === 3) : (neighbors === 3);
            }
        }
        grid = newGrid;
    }

    function countNeighbors(x, y) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                const newX = (x + i + gridSize) % gridSize;
                const newY = (y + j + gridSize) % gridSize;
                if (grid[newX][newY]) count++;
            }
        }
        return count;
    }

    function randomizeGrid() {
        grid = grid.map(row => row.map(() => Math.random() > 0.7));
    }

    randomizeGrid();
    renderGrid();

    setInterval(() => {
        updateGrid();
        renderGrid();
    }, 200);
});