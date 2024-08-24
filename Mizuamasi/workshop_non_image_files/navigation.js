const totalSlides = 10;

function goToSlide(slideNumber) {
    if (slideNumber < 1 || slideNumber > totalSlides) return;
    
    const filename = slideNumber === 1 ? 'index.html' : `slide${slideNumber}.html`;
    window.location.href = filename;
}

function getCurrentSlide() {
    return parseInt(document.body.getAttribute('data-slide'));
}

document.addEventListener('DOMContentLoaded', () => {
    const prevButton = document.querySelector('.prev-slide');
    const nextButton = document.querySelector('.next-slide');
    const currentSlide = getCurrentSlide();

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
        });
    }

    if (currentSlide === 1) {
        if (prevButton) prevButton.style.display = 'none';
    }

    if (currentSlide === totalSlides) {
        if (nextButton) nextButton.style.display = 'none';
    }
});