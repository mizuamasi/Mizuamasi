// auth.js

// Google認証の管理

import { updateSavedCodesUI } from './storage.js';
import { showLoginScreen, showMainContent } from './app.js';

export let nickname = '';
export let uuid = '';

let loggedIn = false;

export function onSignIn(response) {
    // 認証処理
    const userObject = jwt_decode(response.credential);
    nickname = userObject.name;
    uuid = userObject.sub;

    // ユーザー名をツールバーに表示
    const userDisplay = document.getElementById('user-display');
    userDisplay.textContent = `ようこそ、${nickname}さん`;

    // ログイン状態を更新
    loggedIn = true;

    // ログイン画面を非表示にしてメインコンテンツを表示
    showMainContent();

    // その他の認証後の処理
    updateSavedCodesUI();
}

export function signOut() {
    google.accounts.id.disableAutoSelect();
    loggedIn = false;
    // ログイン画面に戻る
    showLoginScreen();
}

export function isLoggedIn() {
    return loggedIn;
}
