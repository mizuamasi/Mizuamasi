function goToSlide(slideNumber) {
    window.location.href = slideNumber === 1 ? 'index.html' : `slide${slideNumber}.html`;
}

function goToNextSlide() {
    const currentSlide = parseInt(document.body.dataset.slide);
    const nextSlide = currentSlide + 1;
    if (nextSlide <= 5) {
        goToSlide(nextSlide);
    } else {
        goToSlide(1);
    }
}

function goToPreviousSlide() {
    const currentSlide = parseInt(document.body.dataset.slide);
    const previousSlide = currentSlide - 1;
    if (previousSlide >= 1) {
        goToSlide(previousSlide);
    } else {
        goToSlide(5);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const nextButton = document.querySelector('.next-slide');
    const prevButton = document.querySelector('.prev-slide');

    if (nextButton) {
        nextButton.addEventListener('click', goToNextSlide);
    }
    if (prevButton) {
        prevButton.addEventListener('click', goToPreviousSlide);
    }
});