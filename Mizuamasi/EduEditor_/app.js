// app.js

// メインアプリケーションエントリーポイント

import { initEditor, editor } from './editor.js';
import { initWebGL, resizeCanvas, getGLContext } from './shader.js';
import { generateUniformUI } from './uniforms.js';
import { initAudio, toggleMic, toggleWaveform, changeMicDevice } from './audio.js';
import { onSignIn, signOut, isLoggedIn } from './auth.js';
import { setupVerticalDragHandle } from './utils.js';
import { saveCode, loadCode, updateSavedCodesUI } from './storage.js';
import { compileShader } from './shader.js';
import { CLIENT_ID } from './config.js';

// `onSignIn` 関数をグローバルスコープに設定
window.onSignIn = onSignIn;

export function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
}

export function showMainContent() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    initEditor();
    initWebGL();
    generateUniformUI();
    initAudio();

    checkForCachedCode(); // キャッシュの確認

    document.getElementById('open-popup').addEventListener('click', openPopup);
    document.getElementById('toggle-editor').addEventListener('click', toggleEditorVisibility);
    document.getElementById('save-code-button').addEventListener('click', saveCode);
    document.getElementById('load-code-button').addEventListener('click', function() {
        const codeName = document.getElementById('saved-codes-select').value;
        if (codeName) {
            loadCode(codeName);
        } else {
            alert('コードを選択してください。');
        }
    });
    document.getElementById('toggle-mic').addEventListener('click', toggleMic);
    document.getElementById('toggle-waveform').addEventListener('click', toggleWaveform);
    document.getElementById('mic-select').addEventListener('change', changeMicDevice);

    setupVerticalDragHandle();
    window.addEventListener('resize', resizeCanvas);
}

window.onload = function() {
    // Initialize Google Sign-In
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: onSignIn,
        auto_select: false,
        itp_support: true,
        use_fedcm_for_prompt: false
    });

    // Render the sign-in button
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'large' } // customization attributes
    );

    // Optionally prompt the user
    google.accounts.id.prompt();

    // Check if already signed in
    if (isLoggedIn()) {
        showMainContent();
    } else {
        showLoginScreen();
    }
};

function checkForCachedCode() {
    // キャッシュの確認処理
    const cachedCode = localStorage.getItem('cachedCode');
    if (cachedCode) {
        const restore = confirm('以前の編集内容が見つかりました。復元しますか？');
        if (restore) {
            editor.setValue(cachedCode);
            compileShader();
        } else {
            localStorage.removeItem('cachedCode');
        }
    }
}

// ポップアップウィンドウの開閉
let popupWindow = null;

function openPopup() {
    if (popupWindow == null || popupWindow.closed) {
        popupWindow = window.open('popup.html', 'Shader Output', 'width=800,height=600');
    } else {
        popupWindow.focus();
    }
    sendShaderDataToPopup();
}

// シェーダーコードをポップアップに送信
function sendShaderDataToPopup() {
    if (popupWindow && !popupWindow.closed) {
        const shaderData = {
            shaderCode: editor.getValue(),
            uniforms: uniforms // assuming uniforms is globally accessible
        };
        popupWindow.postMessage(shaderData, '*');
    }
}

// エディター表示/非表示の切り替え
let isEditorVisible = true;

function toggleEditorVisibility() {
    isEditorVisible = !isEditorVisible;
    const editorContainer = document.getElementById('editor-error-container');
    editorContainer.style.display = isEditorVisible ? 'flex' : 'none';
    document.getElementById('toggle-editor').innerHTML = isEditorVisible ? '<i class="fas fa-code"></i>' : '<i class="fas fa-code"></i>';
}
