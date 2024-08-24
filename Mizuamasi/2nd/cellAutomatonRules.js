const currentGrid = document.getElementById('currentGrid');
const nextGrid = document.getElementById('nextGrid');
const explanation = document.getElementById('explanation');
const ruleSelect = document.getElementById('ruleSelect');
const ruleDescription = document.getElementById('ruleDescription');
const applyRuleButton = document.getElementById('applyRule');
const resetButton = document.getElementById('reset');

let currentCells = Array(9).fill(0);

const rules = [
    {
        name: "標準的なルール",
        description: "周りに黒いセルが2つか3つあれば黒くなり、それ以外は白くなります。",
        apply: (neighbors) => neighbors === 2 || neighbors === 3 ? 1 : 0
    },
    {
        name: "反転ルール",
        description: "周りに黒いセルが2つか3つあれば白くなり、それ以外は黒くなります。",
        apply: (neighbors) => neighbors === 2 || neighbors === 3 ? 0 : 1
    },
    {
        name: "過密ルール",
        description: "周りに黒いセルが4つ以上あれば黒くなり、それ以外は白くなります。",
        apply: (neighbors) => neighbors >= 4 ? 1 : 0
    },
    {
        name: "孤立ルール",
        description: "周りに黒いセルが1つ以下なら黒くなり、それ以外は白くなります。",
        apply: (neighbors) => neighbors <= 1 ? 1 : 0
    }
];

function createGrid(container, cells, clickable = false) {
    container.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell' + (cells[i] ? ' black' : '');
        if (clickable) {
            cell.addEventListener('click', () => toggleCell(i));
        }
        container.appendChild(cell);
    }
}

function toggleCell(index) {
    currentCells[index] = 1 - currentCells[index];
    createGrid(currentGrid, currentCells, true);
    createGrid(nextGrid, currentCells);
}

function countNeighbors(index) {
    const offsets = [-4, -3, -2, -1, 1, 2, 3, 4];
    return offsets.reduce((count, offset) => {
        const neighborIndex = index + offset;
        if (neighborIndex >= 0 && neighborIndex < 9 && Math.abs((index % 3) - (neighborIndex % 3)) <= 1) {
            return count + currentCells[neighborIndex];
        }
        return count;
    }, 0);
}

function applyRule() {
    const selectedRule = rules[ruleSelect.selectedIndex];
    const nextCells = currentCells.map((cell, index) => {
        const neighbors = countNeighbors(index);
        return selectedRule.apply(neighbors);
    });
    createGrid(nextGrid, nextCells);
    explanation.textContent = `ルール "${selectedRule.name}" を適用しました。`;
}

function reset() {
    currentCells = Array(9).fill(0);
    createGrid(currentGrid, currentCells, true);
    createGrid(nextGrid, currentCells);
    explanation.textContent = '';
}

function populateRuleSelect() {
    rules.forEach((rule, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = rule.name;
        ruleSelect.appendChild(option);
    });
}

function updateRuleDescription() {
    const selectedRule = rules[ruleSelect.selectedIndex];
    ruleDescription.textContent = selectedRule.description;
}

ruleSelect.addEventListener('change', updateRuleDescription);
applyRuleButton.addEventListener('click', applyRule);
resetButton.addEventListener('click', reset);

populateRuleSelect();
reset();
updateRuleDescription();