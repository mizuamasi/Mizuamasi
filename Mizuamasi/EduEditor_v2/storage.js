// storage.js

// コードの保存と読み込み（GAS経由）

import { GAS_SCRIPT_URL } from './config.js';
import { editor } from './editor.js';
import { getNickname, getUUID } from './auth.js';

// コードを保存する関数
export function saveCode() {
    const code = editor.getValue();
    const codeName = prompt('コードの名前を入力してください:', 'MyShader');
    if (codeName) {
        const data = {
            action: 'saveCode',
            codeName: codeName,
            codeContent: code,
            nickname: getNickname(),
            uuid: getUUID()
        };

        fetch(GAS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', // CORSエラーを防ぐために 'cors' を指定
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            console.log('Code saved successfully.');
            updateSavedCodesUI(); // 保存後にリストを更新
            alert('コードが保存されました。');
        })
        .catch(error => {
            console.error('Error saving code:', error);
        });
    }
}

// コードを読み込む関数
export function loadCode(codeName) {
    const data = {
        action: 'loadCode',
        codeName: codeName,
        nickname: getNickname(),
        uuid: getUUID()
    };

    fetch(GAS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors', // CORSエラーを防ぐために 'cors' を指定
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.text())
    .then(codeContent => {
        if (codeContent) {
            editor.setValue(codeContent);
            compileShader();
            alert(`${codeName} を読み込みました。`);
        } else {
            alert('コードが見つかりませんでした。');
        }
    })
    .catch(error => {
        console.error('Error loading code:', error);
    });
}

// 保存されたコードのリストを更新する関数
export function updateSavedCodesUI() {
    const data = {
        action: 'getSavedCodes',
        nickname: getNickname(),
        uuid: getUUID()
    };

    fetch(GAS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors', // CORSエラーを防ぐために 'cors' を指定
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(savedCodes => {
        const savedCodesSelect = document.getElementById('saved-codes-select');
        if (!savedCodesSelect) return;

        savedCodesSelect.innerHTML = ''; // 既存のオプションをクリア
        for (let codeName in savedCodes) {
            const option = document.createElement('option');
            option.value = codeName;
            option.textContent = codeName;
            savedCodesSelect.appendChild(option);
        }
    })
    .catch(error => {
        console.error('Error fetching saved codes:', error);
    });
}

// GASへのデータ送信（ログ用）
export function sendShaderDataToGAS() {
    const data = {
        action: 'logUsage',
        nickname: getNickname(),
        uuid: getUUID(),
        timestamp: new Date().toISOString(),
        code: editor.getValue()
    };

    fetch(GAS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors', // CORSエラーを防ぐために 'cors' を指定
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(() => {
        console.log('Usage data sent successfully.');
    })
    .catch(error => {
        console.error('Error sending usage data:', error);
    });
}
