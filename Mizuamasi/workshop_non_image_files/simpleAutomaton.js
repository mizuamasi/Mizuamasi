document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('simple-automaton');
    container.appendChild(canvas);

    const cellSize = 10;
    const gridSize = 40;
    canvas.width = canvas.height = cellSize * gridSize;

    let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(false));

    function randomizeGrid() {
        grid = grid.map(row => row.map(() => Math.random() < 0.3));
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
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
    }

    function animate() {
        updateGrid();
        drawGrid();
        requestAnimationFrame(animate);
    }

    randomizeGrid();
    animate();
});