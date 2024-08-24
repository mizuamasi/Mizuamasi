let currentSlide = 1;
const totalSlides = 10; // スライドの総数を設定

function goToSlide(slideNumber) {
    // スライド番号が範囲内にあることを確認
    slideNumber = Math.max(1, Math.min(slideNumber, totalSlides));
    
    if (slideNumber !== currentSlide) {
        // 新しいスライドのHTMLファイルに遷移
        window.location.href = `slide${slideNumber}.html`;
    }
}

function updateNavigationButtons() {
    const prevButtons = document.querySelectorAll('.prev-slide');
    const nextButtons = document.querySelectorAll('.next-slide');
    
    prevButtons.forEach(button => {
        button.disabled = currentSlide === 1;
    });
    
    nextButtons.forEach(button => {
        button.disabled = currentSlide === totalSlides;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 現在のスライド番号を取得（URLから）
    const match = window.location.pathname.match(/slide(\d+)\.html/);
    if (match) {
        currentSlide = parseInt(match[1]);
    }

    updateNavigationButtons();

    // 次のスライドに進むボタンの設定
    document.querySelectorAll('.next-slide').forEach(button => {
        button.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
        });
    });

    // 前のスライドに戻るボタンの設定
    document.querySelectorAll('.prev-slide').forEach(button => {
        button.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
        });
    });
});