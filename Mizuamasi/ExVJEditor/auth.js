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
    const response = await fetch('https://script.google.com/macros/s/AKfycbxjpZ3tIz3o1QT56076toqw0EkOG7ZwCMtqOvhg6ixbXXZJICdMlZbdJ0AkTOY1pOUqnw/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'register',
        nickname: nickname,
        password: password
      })
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
    const response = await fetch('https://script.google.com/macros/s/AKfycbxjpZ3tIz3o1QT56076toqw0EkOG7ZwCMtqOvhg6ixbXXZJICdMlZbdJ0AkTOY1pOUqnw/exec', {
      method: 'POST',
      mode: 'cors', // CORS対応
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'login',
        nickname: nickname,
        password: password
      })
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
