document.addEventListener('DOMContentLoaded', () => {
    function createAutomaton(containerId, initialPattern) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById(containerId);
        container.appendChild(canvas);

        const cellSize = 10;
        const gridSize = 20;
        canvas.width = canvas.height = cellSize * gridSize;

        let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(false));

        // Initialize with the given pattern
        initialPattern.forEach(([x, y]) => {
            grid[x][y] = true;
        });

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
            drawGrid();
            updateGrid();
            requestAnimationFrame(animate);
        }

        animate();
    }

    // Initialize patterns
    createAutomaton('glider', [[1,0], [2,1], [0,2], [1,2], [2,2]]);
    createAutomaton('blinker', [[1,0], [1,1], [1,2]]);
    createAutomaton('beacon', [[0,0], [1,0], [0,1], [3,2], [2,3], [3,3]]);
});