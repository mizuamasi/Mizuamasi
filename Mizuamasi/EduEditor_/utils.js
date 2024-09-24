// utils.js

// ユーティリティ関数

export function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export function setupVerticalDragHandle() {
    const dragHandle = document.getElementById('vertical-drag-handle');
    const editorContainer = document.getElementById('editor-container');
    const errorLog = document.getElementById('error-log');
    let isDragging = false;

    dragHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        document.body.style.cursor = 'row-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const containerRect = document.getElementById('editor-error-container').getBoundingClientRect();
        let newHeight = e.clientY - containerRect.top;
        if (newHeight < 100) newHeight = 100; // 最小高さ
        if (newHeight > containerRect.height - 100) newHeight = containerRect.height - 100; // 最大高さ
        editorContainer.style.height = newHeight + 'px';
        errorLog.style.height = (containerRect.height - newHeight - dragHandle.offsetHeight) + 'px';
    });

    document.addEventListener('mouseup', function(e) {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
        }
    });
}
