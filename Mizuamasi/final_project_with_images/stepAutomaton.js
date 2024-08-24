document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('step-automaton');
    const cellInfo = document.getElementById('cell-info');
    container.appendChild(canvas);

    const cellSize = 40;
    const gridSize = 10;
    canvas.width = canvas.height = cellSize * gridSize;

    let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(false));

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                ctx.strokeStyle = 'gray';
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
                if (grid[x][y]) {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
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

    function updateGrid() {
        const newGrid = grid.map(row => [...row]);
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const neighbors = countNeighbors(x, y);
                if (grid[x][y]) {
                    newGrid[x][y] = neighbors === 2 || neighbors === 3;
                } else {
                    newGrid[x][y] = neighbors === 3;
                }
            }
        }
        grid = newGrid;
        drawGrid();
    }

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / cellSize);
        const y = Math.floor((event.clientY - rect.top) / cellSize);
        grid[x][y] = !grid[x][y];
        drawGrid();
        updateCellInfo(x, y);
    });

    function updateCellInfo(x, y) {
        const neighbors = countNeighbors(x, y);
        cellInfo.textContent = `セル (${x}, ${y}) - 状態: ${grid[x][y] ? '生' : '死'}, 隣接する生きたセル: ${neighbors}`;
    }

    document.getElementById('next-step').addEventListener('click', updateGrid);
    document.getElementById('reset').addEventListener('click', () => {
        grid = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
        drawGrid();
        cellInfo.textContent = '';
    });

    drawGrid();
});