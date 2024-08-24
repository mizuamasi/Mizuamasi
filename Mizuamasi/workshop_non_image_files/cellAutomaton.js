document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('cell-grid');
    const stepButton = document.getElementById('step');
    const resetButton = document.getElementById('reset');
    const ruleSelect = document.getElementById('rule-select');
    const ruleExplanation = document.getElementById('rule-explanation');
    const explanation = document.getElementById('explanation');

    let cells = [];
    const gridSize = 8;

    function createGrid() {
        grid.innerHTML = '';
        cells = [];
        for (let i = 0; i < gridSize; i++) {
            cells[i] = [];
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.addEventListener('click', () => toggleCell(i, j));
                grid.appendChild(cell);
                cells[i][j] = false;
            }
        }
    }

    function toggleCell(i, j) {
        cells[i][j] = !cells[i][j];
        updateGrid();
    }

    function updateGrid() {
        const cellElements = grid.getElementsByClassName('cell');
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                cellElements[i * gridSize + j].classList.toggle('black', cells[i][j]);
            }
        }
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
                newCells[i][j] = applyRule(cells[i][j], neighbors);
            }
        }
        cells = newCells;
        updateGrid();
    }

    function applyRule(alive, neighbors) {
        const rule = ruleSelect.value;
        switch (rule) {
            case 'gameOfLife':
                return alive ? (neighbors === 2 || neighbors === 3) : (neighbors === 3);
            case 'highLife':
                return alive ? (neighbors === 2 || neighbors === 3) : (neighbors === 3 || neighbors === 6);
            case 'dayAndNight':
                return alive ? (neighbors === 3 || neighbors === 4 || neighbors === 6 || neighbors === 7 || neighbors === 8) :
                               (neighbors === 3 || neighbors === 6 || neighbors === 7 || neighbors === 8);
        }
    }

    function updateRuleExplanation() {
        const rule = ruleSelect.value;
        switch (rule) {
            case 'gameOfLife':
                ruleExplanation.textContent = 'ライフゲーム：生きたセルは2-3個の隣接セルで生存、死んだセルは3個の隣接セルで誕生';
                break;
            case 'highLife':
                ruleExplanation.textContent = 'ハイライフ：生きたセルは2-3個の隣接セルで生存、死んだセルは3か6個の隣接セルで誕生';
                break;
            case 'dayAndNight':
                ruleExplanation.textContent = 'デイ＆ナイト：生きたセルは3-4、6-8個の隣接セルで生存、死んだセルは3、6-8個の隣接セルで誕生';
                break;
        }
    }

    createGrid();
    updateRuleExplanation();

    stepButton.addEventListener('click', step);
    resetButton.addEventListener('click', () => {
        createGrid();
        updateGrid();
    });
    ruleSelect.addEventListener('change', updateRuleExplanation);

    explanation.textContent = 'セルをクリックして初期状態を設定し、「次のステップ」ボタンを押して進化を観察しましょう。';
});