const totalSlides = 6;

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

    prevButton.addEventListener('click', () => {
        goToSlide(currentSlide - 1);
    });

    nextButton.addEventListener('click', () => {
        goToSlide(currentSlide + 1);
    });

    if (currentSlide === 1) {
        prevButton.disabled = true;
    }

    if (currentSlide === totalSlides) {
        nextButton.disabled = true;
    }
});
