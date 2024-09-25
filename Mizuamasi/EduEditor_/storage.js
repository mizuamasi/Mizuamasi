// storage.js
import { editor } from './editor.js';
import { GAS_SCRIPT_URL } from './config.js';
import { getNickname, getUUID } from './auth.js';
import { compileShader } from './shader.js';

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
            mode: 'cors',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            console.log('Code saved successfully.');
            updateSavedCodesUI();
            alert('コードが保存されました。');
        })
        .catch(error => {
            console.error('Error saving code:', error);
        });
    }
}

export function loadCode(codeName) {
    const data = {
        action: 'loadCode',
        codeName: codeName,
        nickname: getNickname(),
        uuid: getUUID()
    };

    fetch(GAS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.content) {
            editor.setValue(data.content);
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

export function updateSavedCodesUI() {
    const data = {
        action: 'getSavedCodes',
        nickname: getNickname(),
        uuid: getUUID()
    };

    fetch(GAS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(savedCodes => {
        const savedCodesSelect = document.getElementById('saved-codes-select');
        if (!savedCodesSelect) return;

        savedCodesSelect.innerHTML = '';
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
        mode: 'cors',
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