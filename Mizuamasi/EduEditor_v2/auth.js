// auth.js

import jwt_decode from 'https://cdn.jsdelivr.net/npm/jwt-decode@3/build/jwt-decode.esm.js';
import { updateSavedCodesUI } from './storage.js';
import { showMainContent, showLoginScreen } from './app.js';

let nickname = '';
let uuid = '';
let loggedIn = false;

export function onSignIn(response) {
    try {
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
    } catch (error) {
        console.error('認証処理中にエラーが発生しました:', error);
    }
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

export function getNickname() {
    return nickname;
}

export function getUUID() {
    return uuid;
}
