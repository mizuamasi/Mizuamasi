// ページリストの定義
const pageList = [
    'introduction.html',
    'shader-intro-2.html',
    'shader-intro-3.html',
    // 必要に応じて他のページを追加
];

// 現在のページインデックスを取得
const currentPageIndex = pageList.indexOf(location.pathname.split('/').pop());

// ナビゲーションヘッダーを作成する関数
function createNavigationHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 1000;
    `;

    // 前へボタン
    if (currentPageIndex > 0) {
        const prevButton = createButton('前へ', () => navigateTo(currentPageIndex - 1));
        header.appendChild(prevButton);
    }

    // タイトル
    const title = document.createElement('span');
    title.textContent = 'シェーダー学習';
    title.style.fontWeight = 'bold';
    header.appendChild(title);

    // 次へボタン
    if (currentPageIndex < pageList.length - 1) {
        const nextButton = createButton('次へ', () => navigateTo(currentPageIndex + 1));
        header.appendChild(nextButton);
    }

    return header;
}

// ボタンを作成する関数
function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    button.style.cssText = `
        background-color: #2980b9;
        border: none;
        color: white;
        padding: 5px 10px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 14px;
        margin: 4px 2px;
        cursor: pointer;
        border-radius: 4px;
    `;
    return button;
}

// ページ遷移関数
function navigateTo(index) {
    if (index >= 0 && index < pageList.length) {
        window.location.href = pageList[index];
    }
}

// ページ読み込み時にナビゲーションヘッダーを追加
window.addEventListener('DOMContentLoaded', () => {
    const header = createNavigationHeader();
    document.body.insertBefore(header, document.body.firstChild);

    // ページコンテンツを下に移動してヘッダーと重ならないようにする
    document.body.style.paddingTop = '50px';
});