document.addEventListener('DOMContentLoaded', function() {
    const showAnswerBtn = document.getElementById('show-answer');
    const answerDiv = document.getElementById('answer');

    showAnswerBtn.addEventListener('click', function() {
        answerDiv.classList.toggle('hidden');
        showAnswerBtn.textContent = answerDiv.classList.contains('hidden') ? '答えを見る' : '答えを隠す';
    });
});