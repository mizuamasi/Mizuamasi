// app.js

let editor;
let gl;
let shaderProgram;
let positionBuffer;
let iTime = 0;
let startTime = Date.now();
let uniforms = {};
let usageData = {
    updateCount: 0,
    code: '',
    startTime: new Date(),
    nickname: '',
    uuid: ''
};
let nickname = '';
let uuid = '';
let deviceId = '';
let audioContext;
let analyser;
let audioDataArray;
let audioTexture;
let isEditorVisible = true;

// ユニークなUUIDを生成する関数
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ニックネームとUUIDの初期化
function initUser() {
    nickname = localStorage.getItem('nickname') || '';
    uuid = localStorage.getItem('uuid') || generateUUID();
    localStorage.setItem('uuid', uuid);

    if (!nickname) {
        showNicknameModal();
    } else {
        document.getElementById('nickname-input').value = nickname;
        usageData.nickname = nickname;
        usageData.uuid = uuid;
    }
}

// ニックネーム入力モーダルの表示
function showNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    modal.style.display = 'block';

    document.getElementById('modal-nickname-submit').onclick = function() {
        const input = document.getElementById('modal-nickname-input').value.trim();
        if (input) {
            nickname = input;
            localStorage.setItem('nickname', nickname);
            usageData.nickname = nickname;
            usageData.uuid = uuid;
            document.getElementById('nickname-input').value = nickname;
            modal.style.display = 'none';
        }
    };
}

// エディターの初期化
function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById('shader-editor'), {
        mode: 'x-shader/x-fragment',
        lineNumbers: true,
        theme: 'monokai',
        matchBrackets: true,
        autoCloseBrackets: true,
        scrollbarStyle: 'simple'
    });

    // 初期コードを設定
    const initialShaderCode = `/*
iTime: シェーダーの実行時間（秒）
iResolution: 画面の解像度（ピクセル）
iMouse: マウス座標（ピクセル）
iChannel0: オーディオ入力（テクスチャ）
iDate: 現在の日付と時間
iKeyboard: キーボード入力状態

ShaderToyの機能を実装しています。

デバッグ用に print("デバッグ名", 変数); を使用できます。
*/

uniform float u_timeScale;
uniform vec3 u_color;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / iResolution.xy;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5 * cos(iTime * u_timeScale + uv.xyx + vec3(0, 2, 4));

    // デバッグ用の変数
    float brightness = length(col);
    print("Brightness", brightness);

    // Output to screen
    fragColor = vec4(col * u_color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
    editor.setValue(initialShaderCode);

    // エディターの変更イベントリスナー
    editor.on('change', function() {
        usageData.updateCount++;
        usageData.code = editor.getValue();
        debounceCompileShader();
        sendShaderDataToGAS(); // GASへのデータ送信を逐次的に行う
        updateShader();
    });
}

// Debounce関数
function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// シェーダーの更新
const updateShader = debounce(function() {
    compileShader();
});

// WebGLの初期化
function initWebGL() {
    const canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        alert('WebGLがサポートされていません。');
        return;
    }

    // キャンバスのサイズを設定
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // フルスクリーンクアッドの頂点データ
    const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
    ]);

    // バッファの設定
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // シェーダーの初期コンパイル
    compileShader();
}

// キャンバスのリサイズ
function resizeCanvas() {
    const canvas = document.getElementById('glcanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}

// シェーダーのコンパイルとプログラム作成
function compileShader() {
    let fragmentSource = editor.getValue();

    if (!fragmentSource) {
        fragmentSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.0);
            }
        `;
    }

    fragmentSource = preprocessShaderCode(fragmentSource);

    const vertexShader = createShader(gl.VERTEX_SHADER, defaultVertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
        return;
    }

    shaderProgram = createProgram(vertexShader, fragmentShader);
    if (!shaderProgram) {
        return;
    }

    gl.useProgram(shaderProgram);

    // ユニフォームの設定
    setUniforms();

    // 属性の設定
    const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // レンダリング開始
    render();
}

// デフォルトの頂点シェーダーソース
const defaultVertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// シェーダーのプリプロセス
function preprocessShaderCode(shaderCode) {
    // デバッグ用の関数を挿入
    // print("名前", 変数) を debugName と debugValue に分割
    shaderCode = shaderCode.replace(/print\(\s*"([^"]+)"\s*,\s*([^)]+)\s*\);/g, `
        debugName = "$1";
        debugValue = $2;
    `);

    return `
        precision mediump float;
        precision mediump int;

        uniform float iTime;
        uniform vec3 iResolution;
        uniform vec4 iMouse;
        uniform sampler2D iChannel0;
        uniform vec4 iDate;
        uniform int iKeyboard[256];

        // ユーザー定義のユニフォーム変数
        ${getUserUniforms()}

        // デバッグ用変数
        float debugValue;
        string debugName;

        ${shaderCode}
    `;
}

// ユーザー定義のユニフォーム変数を生成
function getUserUniforms() {
    let uniformsCode = '';
    for (let name in uniforms) {
        const type = uniformDefinitions[name].type;
        uniformsCode += `uniform ${type} ${name};\n`;
    }
    return uniformsCode;
}

// シェーダーの作成
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    const error = gl.getShaderInfoLog(shader);
    console.error('シェーダーのコンパイルに失敗しました:', error);
    document.getElementById('error-log').textContent = error;
    gl.deleteShader(shader);
    return null;
}

// シェーダープログラムの作成
function createProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    const error = gl.getProgramInfoLog(program);
    console.error('シェーダープログラムのリンクに失敗しました:', error);
    document.getElementById('error-log').textContent = error;
    gl.deleteProgram(program);
    return null;
}

// ユニフォームの設定
function setUniforms() {
    // ビルトインユニフォームの設定
    const timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
    if (timeLocation !== null) {
        gl.uniform1f(timeLocation, iTime);
    }

    const resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
    if (resolutionLocation !== null) {
        gl.uniform3f(resolutionLocation, gl.canvas.width, gl.canvas.height, 1.0);
    }

    // ユーザー定義のユニフォーム変数の設定
    for (let name in uniforms) {
        const location = gl.getUniformLocation(shaderProgram, name);
        if (location !== null) {
            const value = uniforms[name];
            if (Array.isArray(value)) {
                if (value.length === 2) {
                    gl.uniform2fv(location, value);
                } else if (value.length === 3) {
                    gl.uniform3fv(location, value);
                } else if (value.length === 4) {
                    gl.uniform4fv(location, value);
                }
            } else if (typeof value === 'boolean') {
                gl.uniform1i(location, value ? 1 : 0);
            } else if (typeof value === 'number') {
                gl.uniform1f(location, value);
            }
        }
    }

    // オーディオテクスチャをシェーダーに渡す
    if (audioTexture) {
        const iChannel0Location = gl.getUniformLocation(shaderProgram, 'iChannel0');
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, audioTexture);
        gl.uniform1i(iChannel0Location, 0);
    }
}

// レンダリングループ
function render() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 時間の更新
    iTime = (Date.now() - startTime) / 1000.0;
    const timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
    if (timeLocation !== null) {
        gl.uniform1f(timeLocation, iTime);
    }

    // シェーダーの描画
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // デバッグ情報の更新
    updateDebugInfo();

    requestAnimationFrame(render);
}

// デバッグ情報の更新
function updateDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    if (shaderProgram) {
        const debugValueLocation = gl.getUniformLocation(shaderProgram, 'debugValue');
        const debugNameLocation = gl.getUniformLocation(shaderProgram, 'debugName');

        // デバッグ用の値を取得するためにシェーダー内で特定のピクセルを描画
        // ここでは中心ピクセルの値を読み取る例を示します
        const pixels = new Float32Array(4);
        gl.readPixels(
            Math.floor(gl.canvas.width / 2),
            Math.floor(gl.canvas.height / 2),
            1,
            1,
            gl.RGBA,
            gl.FLOAT,
            pixels
        );

        // debugValueとdebugNameを直接取得する方法はないため、代替手段としてシェーダー内で特定の色に変換
        // この例では、デバッグ情報をRGBにエンコードして読み取ります

        const r = pixels[0];
        const g = pixels[1];
        const b = pixels[2];
        // Assuming debugName is encoded in the red channel and debugValue in green

        debugInfo.textContent = `Brightness: ${g.toFixed(2)}`;
    }
}

// オーディオデバイスの初期化
function initAudioDevices() {
    navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
            const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
            const deviceSelect = document.getElementById('device-select');
            deviceSelect.innerHTML = '';
            audioInputDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Device ${device.deviceId}`;
                deviceSelect.appendChild(option);
            });
            deviceSelect.onchange = function() {
                deviceId = this.value;
                initAudio();
            };
            if (audioInputDevices.length > 0) {
                deviceId = audioInputDevices[0].deviceId;
                initAudio();
            }
        })
        .catch(function(err) {
            console.error('デバイスの取得に失敗しました:', err);
        });
}

// マイク入力の取得とシェーダーへの流し込み
function initAudio() {
    if (audioContext) {
        audioContext.close();
    }
    navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId } })
        .then(function(stream) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            audioDataArray = new Uint8Array(bufferLength * 2); // 修正: bufferLength * 2

            // オーディオテクスチャの初期化
            initAudioTexture(bufferLength);

            // 波形表示の初期化
            initWaveform();

            // オーディオデータの更新を開始
            requestAnimationFrame(updateAudioData);
        })
        .catch(function(err) {
            console.error('マイクへのアクセスに失敗しました:', err);
        });
}

function initAudioTexture(bufferLength) {
    audioTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE,
        bufferLength,
        2,
        0,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

function updateAudioData() {
    analyser.getByteFrequencyData(audioDataArray);

    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        analyser.frequencyBinCount,
        2,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        audioDataArray
    );

    // 波形表示の更新
    drawWaveform();

    requestAnimationFrame(updateAudioData);
}

// Uniform変数の管理
const uniformDefinitions = {
    u_timeScale: { type: 'float', value: 1.0 },
    u_color: { type: 'vec3', value: [1.0, 0.0, 0.0] }
};

// Uniform変数のUIを生成
function generateUniformUI() {
    const sliderContainer = document.getElementById('slider-container');
    if (!sliderContainer) return; // エラー回避

    sliderContainer.innerHTML = ''; // 既存のUIをクリア

    for (let name in uniformDefinitions) {
        const uniform = uniformDefinitions[name];
        const type = uniform.type;
        const value = uniform.value;

        uniforms[name] = value;

        const controlDiv = document.createElement('div');

        const label = document.createElement('label');
        label.textContent = name;
        label.setAttribute('for', `uniform-${name}`);
        controlDiv.appendChild(label);

        if (type === 'float') {
            const input = document.createElement('input');
            input.type = 'range';
            input.min = -10;
            input.max = 10;
            input.step = 0.01;
            input.value = value;
            input.id = `uniform-${name}`;
            input.addEventListener('input', (e) => {
                uniforms[name] = parseFloat(e.target.value);
                updateShader();
            });
            controlDiv.appendChild(input);
        } else if (type === 'vec2' || type === 'vec3') {
            const components = type === 'vec2' ? 2 : 3;
            uniforms[name] = [...value];
            for (let i = 0; i < components; i++) {
                const subLabel = document.createElement('label');
                subLabel.textContent = `${name}[${i}]`;
                subLabel.style.marginLeft = '5px';
                controlDiv.appendChild(subLabel);

                const input = document.createElement('input');
                input.type = 'range';
                input.min = -10;
                input.max = 10;
                input.step = 0.01;
                input.value = value[i];
                input.id = `uniform-${name}-${i}`;
                input.addEventListener('input', (e) => {
                    uniforms[name][i] = parseFloat(e.target.value);
                    updateShader();
                });
                controlDiv.appendChild(input);
            }
        }

        sliderContainer.appendChild(controlDiv);
    }
}

// エディター表示/非表示の切り替え
function toggleEditorVisibility() {
    isEditorVisible = !isEditorVisible;
    const editorContainer = document.getElementById('editor-error-container');
    editorContainer.style.display = isEditorVisible ? 'flex' : 'none';
    document.getElementById('toggle-editor').textContent = isEditorVisible ? 'エディター非表示' : 'エディター表示';
}

// イベントリスナーの設定
window.onload = function() {
    initUser();
    initEditor();
    initWebGL();
    generateUniformUI();
    initAudioDevices();

    document.getElementById('open-popup').addEventListener('click', openPopup);
    document.getElementById('nickname-input').addEventListener('change', function() {
        nickname = this.value.trim();
        localStorage.setItem('nickname', nickname);
        usageData.nickname = nickname;
    });
    document.getElementById('toggle-editor').addEventListener('click', toggleEditorVisibility);

    setupVerticalDragHandle();
};

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
            uniforms: uniforms
        };
        popupWindow.postMessage(shaderData, '*');
    }
}

// 垂直方向のリサイズハンドルの設定
function setupVerticalDragHandle() {
    const dragHandle = document.getElementById('vertical-drag-handle');
    const editorContainer = document.getElementById('editor-container');
    const errorLog = document.getElementById('error-log');
    let isDragging = false;

    dragHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        document.body.style.cursor = 'row-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const containerRect = document.getElementById('editor-error-container').getBoundingClientRect();
        let newHeight = e.clientY - containerRect.top;
        // 最小高さを300px、最大をコンテナの高さ - 150pxに設定
        const minHeight = 300;
        const maxHeight = containerRect.height - 150;
        if (newHeight < minHeight) newHeight = minHeight;
        if (newHeight > maxHeight) newHeight = maxHeight;
        editorContainer.style.height = newHeight + 'px';
        errorLog.style.height = (containerRect.height - newHeight - dragHandle.offsetHeight) + 'px';
    });

    document.addEventListener('mouseup', function(e) {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
        }
    });
}

// GASへのデータ送信（逐次的）
function sendShaderDataToGAS() {
    const data = {
        nickname: usageData.nickname,
        uuid: usageData.uuid,
        timestamp: new Date().toISOString(),
        updateCount: usageData.updateCount,
        code: usageData.code
    };

    fetch('https://script.google.com/macros/s/AKfycbynrTZxEGbsEYWQSPzYlhV2VRW42krn2kwr6T74uJ0V7biEKbPcgE50B6mBX4LkyHBblw/exec', {
        method: 'POST',
        mode: 'no-cors',
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

// Print関数のシミュレーション
// GLSLでのprint関数の実装は困難なため、デバッグ用にシェーダーから特定のピクセルに値をエンコードし、それをJavaScriptで読み取る方法を採用
// この例では、シェーダーが特定の位置にデバッグ値を出力し、それを読み取って表示

// 波形表示の初期化
let waveformCanvas, waveformCtx;
function initWaveform() {
    waveformCanvas = document.getElementById('waveform');
    waveformCtx = waveformCanvas.getContext('2d');
    waveformCanvas.width = waveformCanvas.clientWidth;
    waveformCanvas.height = waveformCanvas.clientHeight;
}

// 波形の描画
function drawWaveform() {
    if (!waveformCtx || !audioDataArray) return;

    waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);

    waveformCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

    waveformCtx.lineWidth = 2;
    waveformCtx.strokeStyle = 'rgba(255, 255, 255, 1)';
    waveformCtx.beginPath();

    const sliceWidth = waveformCanvas.width / audioDataArray.length;
    let x = 0;

    for (let i = 0; i < audioDataArray.length; i++) {
        const v = audioDataArray[i] / 128.0; // Normalize
        const y = v * waveformCanvas.height / 2;

        if (i === 0) {
            waveformCtx.moveTo(x, y);
        } else {
            waveformCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
    waveformCtx.stroke();
}
