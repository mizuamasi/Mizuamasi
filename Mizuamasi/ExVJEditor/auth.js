// auth.js

document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('login-btn').addEventListener('click', login);

/**
 * ユーザー登録関数
 */
async function register() {
  const nickname = document.getElementById('nickname').value.trim();
  const password = document.getElementById('password').value.trim();
  const spinner = document.getElementById('auth-spinner');

  if (!validateNickname(nickname) || !validatePassword(password)) {
    alert('ニックネームまたはパスワードが無効です。');
    return;
  }

  try {
    // スピナーを表示
    spinner.style.display = 'block';

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
  } finally {
    // スピナーを非表示
    spinner.style.display = 'none';
  }
}

/**
 * ユーザーログイン関数
 */
async function login() {
  const nickname = document.getElementById('nickname').value.trim();
  const password = document.getElementById('password').value.trim();
  const spinner = document.getElementById('auth-spinner');

  try {
    // スピナーを表示
    spinner.style.display = 'block';

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
  } finally {
    // スピナーを非表示
    spinner.style.display = 'none';
  }
}

/**
 * ニックネームのバリデーション関数
 * @param {string} nickname - ニックネーム
 * @return {boolean} - バリデーション結果
 */
function validateNickname(nickname) {
  const invalidChars = /[\/\\\?\%\*\:\|\\"<>\s]/;
  return !invalidChars.test(nickname) && nickname.length > 0;
}

/**
 * パスワードのバリデーション関数
 * @param {string} password - パスワード
 * @return {boolean} - バリデーション結果
 */
function validatePassword(password) {
  return password.length > 0;
}
