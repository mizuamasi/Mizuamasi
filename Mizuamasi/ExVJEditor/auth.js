// auth.js

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const continueWithoutTrackingBtn = document.getElementById('continue-without-tracking-btn');
  
  loginBtn.addEventListener('click', handleLogin);
  registerBtn.addEventListener('click', handleRegister);
  continueWithoutTrackingBtn.addEventListener('click', handleContinueWithoutTracking);
});

function handleLogin() {
  const nickname = document.getElementById('nickname-input').value.trim();
  const password = document.getElementById('password-input').value.trim();

  if (!nickname || !password) {
    alert('ニックネームとパスワードを入力してください。');
    return;
  }

  showSpinner();

  // 認証APIへのリクエスト（例）
  const data = new URLSearchParams();
  data.append('action', 'login');
  data.append('nickname', nickname);
  data.append('password', password);

  fetch('https://script.google.com/macros/s/AKfycbynrTZxEGbsEYWQSPzYlhV2VRW42krn2kwr6T74uJ0V7biEKbPcgE50B6mBX4LkyHBblw/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: data.toString()
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      // セッション情報を保存（例）
      localStorage.setItem('session', JSON.stringify({ isLoggedIn: true, nickname: nickname }));
      window.location.href = 'editor.html';
    } else {
      handleAuthFailure(result.message);
    }
  })
  .catch(error => {
    console.error('ログインエラー:', error);
    handleAuthFailure('ネットワークエラー');
  });
}

function handleRegister() {
  const nickname = document.getElementById('nickname-input').value.trim();
  const password = document.getElementById('password-input').value.trim();

  if (!nickname || !password) {
    alert('ニックネームとパスワードを入力してください。');
    return;
  }

  showSpinner();

  // 登録APIへのリクエスト（例）
  const data = new URLSearchParams();
  data.append('action', 'register');
  data.append('nickname', nickname);
  data.append('password', password);

  fetch('https://script.google.com/macros/s/AKfycbynrTZxEGbsEYWQSPzYlhV2VRW42krn2kwr6T74uJ0V7biEKbPcgE50B6mBX4LkyHBblw/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: data.toString()
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      alert('登録が成功しました。ログインしてください。');
      hideSpinner();
    } else {
      handleAuthFailure(result.message);
    }
  })
  .catch(error => {
    console.error('登録エラー:', error);
    handleAuthFailure('ネットワークエラー');
  });
}

function handleContinueWithoutTracking() {
  // セッションを設定しない
  window.location.href = 'editor.html';
}

function handleAuthFailure(message) {
  alert(`認証に失敗しました: ${message}`);
  hideSpinner();
}

function showSpinner() {
  const spinner = document.getElementById('auth-spinner');
  if (spinner) {
    spinner.classList.remove('hidden');
  }
}

function hideSpinner() {
  const spinner = document.getElementById('auth-spinner');
  if (spinner) {
    spinner.classList.add('hidden');
  }
}
