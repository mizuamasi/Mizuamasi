document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('custom-automaton');
    container.appendChild(canvas);

    const cellSize = 40; // セルサイズを調整
    const gridSize = 10; // グリッドサイズを調整
    canvas.width = canvas.height = cellSize * gridSize;

    let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
    let surviveRule = [2, 3];
    let birthRule = [3];

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
                    newGrid[x][y] = surviveRule.includes(neighbors);
                } else {
                    newGrid[x][y] = birthRule.includes(neighbors);
                }
            }
        }
        grid = newGrid;
        drawGrid();
    }

    // クリックイベントでセルの状態を切り替える
    canvas.addEventListener('click', (event) => {
        const x = Math.floor(event.offsetX / cellSize);
        const y = Math.floor(event.offsetY / cellSize);
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            grid[x][y] = !grid[x][y]; // セルの状態を切り替え
            drawGrid(); // グリッドを再描画
        }
    });

    function animate() {
        updateGrid();
        requestAnimationFrame(animate);
    }

    function applyRules() {
        const surviveInput = document.getElementById('survive-rule').value.split(',').map(Number);
        const birthInput = document.getElementById('birth-rule').value.split(',').map(Number);
        surviveRule = surviveInput;
        birthRule = birthInput;
        drawGrid();
    }

    document.getElementById('apply-rules').addEventListener('click', applyRules);

    drawGrid();
    animate();
});
