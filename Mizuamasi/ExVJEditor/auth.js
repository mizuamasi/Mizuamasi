// auth.js

document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('login-btn').addEventListener('click', login);

async function register() {
  const nickname = document.getElementById('nickname').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!validateNickname(nickname) || !validatePassword(password)) {
    alert('ニックネームまたはパスワードが無効です。');
    return;
  }

  try {
    const data = new URLSearchParams();
    data.append('action', 'register');
    data.append('nickname', nickname);
    data.append('password', password);

    const response = await fetch('https://script.google.com/macros/s/AKfycbynrTZxEGbsEYWQSPzYlhV2VRW42krn2kwr6T74uJ0V7biEKbPcgE50B6mBX4LkyHBblw/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data.toString()
    });

    const result = await response.json();

    if (result.success) {
      alert('登録が完了しました。ログインしてください。');
    } else {
      alert('登録に失敗しました: ' + result.message);
    }
  } catch (error) {
    console.error('登録エラー:', error);
    alert('登録中にエラーが発生しました。');
  }
}

async function login() {
  const nickname = document.getElementById('nickname').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const data = new URLSearchParams();
    data.append('action', 'login');
    data.append('nickname', nickname);
    data.append('password', password);

    const response = await fetch('https://script.google.com/macros/s/AKfycbynrTZxEGbsEYWQSPzYlhV2VRW42krn2kwr6T74uJ0V7biEKbPcgE50B6mBX4LkyHBblw/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data.toString()
    });

    const result = await response.json();

    if (result.success) {
      // ローカルストレージにセッション情報を保存
      localStorage.setItem('session', JSON.stringify({ nickname: nickname }));
      // エディター画面に遷移
      window.location.href = 'editor.html';
    } else {
      alert('ログインに失敗しました: ' + result.message);
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    alert('ログイン中にエラーが発生しました。');
  }
}

function validateNickname(nickname) {
  const invalidChars = /[\/\\\?\%\*\:\|\\"<>\s]/;
  return !invalidChars.test(nickname) && nickname.length > 0;
}

function validatePassword(password) {
  return password.length > 0;
}
