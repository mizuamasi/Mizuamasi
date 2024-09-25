// main.js

// 必要なモジュールのインポート
import { GAS_SCRIPT_URL, CLIENT_ID } from './config.js';
import { debounce, setupVerticalDragHandle } from './utils.js';
import { resetUniformDefinitions, resetExistingUniforms, generateUniformUI, uniforms } from './uniforms.js';
import { initEditor, getEditorInstance } from './editor.js';
import { initWebGL, compileShader, getGLContext, updateShader } from './shader.js';
import { initAudio, toggleMic, toggleWaveform, changeMicDevice } from './audio.js';
import { onSignIn, signOut, isLoggedIn, getNickname, getUUID } from './auth.js';
import { saveCode, loadCode, updateSavedCodesUI, sendShaderDataToGAS } from './storage.js';

// onSignIn 関数をグローバルスコープに設定
window.onSignIn = onSignIn;

// メインコンテンツの表示
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

// ログイン画面の表示
export function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
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
            const editorInstance = getEditorInstance();
            editorInstance.setValue(cachedCode);
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
        const editorInstance = getEditorInstance();
        const shaderData = {
            shaderCode: editorInstance.getValue(),
            uniforms: uniforms // uniformsを正しく参照
        };
        popupWindow.postMessage(shaderData, '*');
    }
}

// エディター表示/非表示の切り替え
let isEditorVisible = true;

function toggleEditorVisibility() {
    isEditorVisible = !isEditorVisible;
    const editorContainer = document.getElementById('editor-container');
    editorContainer.style.display = isEditorVisible ? 'block' : 'none';
    document.getElementById('toggle-editor').innerHTML = isEditorVisible ? '<i class="fas fa-code"></i>' : '<i class="fas fa-code"></i>';
}
