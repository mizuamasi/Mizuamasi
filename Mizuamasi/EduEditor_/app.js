// グローバル変数の定義
let editor;
let glCanvas;
let gl;
let shaderProgram;
let uniforms = {};
let sliders = {};
let audioContext;
let audioDataArray;
let nickname = '';
let usageData = {
    startTime: Date.now(),
    updateCount: 0,
    code: ''
};
let selectedDeviceId = 'default';

// ニックネームの取得
document.getElementById('nickname').addEventListener('change', function() {
    nickname = this.value;
});

// エディターの初期化
function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById('shader-editor'), {
        mode: 'x-shader/x-fragment',
        lineNumbers: true,
        theme: 'default',
        matchBrackets: true,
        autoCloseBrackets: true
    });

    editor.on('change', function() {
        usageData.updateCount++;
        usageData.code = editor.getValue();
        debounceCompileShader();
    });
}

// デバウンス関数でコンパイル頻度を制御
let debounceTimer;
function debounceCompileShader() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(compileShader, 300);
}

// シェーダーのコンパイルと実行
function compileShader() {
    let shaderSource = editor.getValue();
    shaderSource = preprocessShaderCode(shaderSource);
    parseUniforms(shaderSource);

    // エラーメッセージのクリア
    displayError('');

    // シェーダーのコンパイル処理
    if (shaderProgram) {
        gl.deleteProgram(shaderProgram);
    }

    const vertexShaderSource = defaultVertexShaderSource;
    const fragmentShaderSource = shaderSource;

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

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

    // レンダリング開始
    render();
}

// シェーダーのプリプロセス（print関数の処理）
function preprocessShaderCode(shaderCode) {
    shaderCode = shaderCode.replace(/print\(([^)]+)\);/g, 'gl_FragColor = vec4(vec3($1), 1.0); return;');
    return shaderCode;
}

// シェーダーとプログラムの作成関数
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    const error = gl.getShaderInfoLog(shader);
    displayError(`シェーダーのコンパイルに失敗しました:\n${error}`);
    gl.deleteShader(shader);
    return null;
}

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
    displayError(`シェーダープログラムのリンクに失敗しました:\n${error}`);
    gl.deleteProgram(program);
    return null;
}

// ユニフォーム変数の解析とスライダーの生成
function parseUniforms(shaderSource) {
    // スライダーのリセット
    document.getElementById('slider-container').innerHTML = '';
    uniforms = {};
    sliders = {};

    const uniformRegex = /uniform\s+float\s+(\w+);/g;
    let match;
    while ((match = uniformRegex.exec(shaderSource)) !== null) {
        const uniformName = match[1];
        createSlider(uniformName);
    }
}

function createSlider(name) {
    const container = document.getElementById('slider-container');
    const sliderLabel = document.createElement('label');
    sliderLabel.innerText = name;

    const sliderInput = document.createElement('input');
    sliderInput.type = 'range';
    sliderInput.min = 0;
    sliderInput.max = 1;
    sliderInput.step = 0.01;
    sliderInput.value = 0.5;

    sliderInput.addEventListener('input', function() {
        uniforms[name] = parseFloat(this.value);
    });

    sliders[name] = sliderInput;
    uniforms[name] = parseFloat(sliderInput.value);

    const sliderContainer = document.createElement('div');
    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(sliderInput);

    container.appendChild(sliderContainer);
}

// 音声入力の取得
function initAudio() {
    navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } })
        .then(function(stream) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            analyser.fftSize = 512;
            const bufferLength = analyser.frequencyBinCount;
            audioDataArray = new Uint8Array(bufferLength);

            // オーディオテクスチャの作成
            audioTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, audioTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, bufferLength, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            function updateAudioData() {
                analyser.getByteFrequencyData(audioDataArray);

                // テクスチャに音声データをアップロード
                gl.bindTexture(gl.TEXTURE_2D, audioTexture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bufferLength, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, audioDataArray);

                requestAnimationFrame(updateAudioData);
            }
            updateAudioData();
        })
        .catch(function(err) {
            console.error('音声入力の取得に失敗しました:', err);
        });
}

// 音声デバイスのリストを取得
function getAudioDevices() {
    navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
            const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
            const deviceSelect = document.getElementById('audio-device-select');
            audioInputDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `マイクデバイス ${device.deviceId}`;
                deviceSelect.appendChild(option);
            });

            deviceSelect.addEventListener('change', function() {
                selectedDeviceId = this.value;
                initAudio();
            });
        })
        .catch(function(err) {
            console.error('オーディオデバイスの取得に失敗しました:', err);
        });
}

// WebGLの初期化
function initWebGL() {
    glCanvas = document.createElement('canvas');
    glCanvas.id = 'glcanvas';
    document.body.appendChild(glCanvas);

    gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    if (!gl) {
        alert('WebGLがサポートされていません。');
        return;
    }

    // デフォルトの頂点シェーダーソース
    defaultVertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

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
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

// ユニフォームの設定
function setUniforms() {
    // ユニフォーム変数の設定
    for (let name in uniforms) {
        const location = gl.getUniformLocation(shaderProgram, name);
        gl.uniform1f(location, uniforms[name]);
    }

    // 音声データのテクスチャをユニフォームに設定
    const audioSamplerLocation = gl.getUniformLocation(shaderProgram, 'iChannel0');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.uniform1i(audioSamplerLocation, 0);
}

// レンダリングループ
function render() {
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 属性の設定
    const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // ドローコール
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

// エラーメッセージの表示
function displayError(message) {
    document.getElementById('error-message').textContent = message;
}

// 使用履歴の送信
function sendUsageData() {
    const endTime = Date.now();
    usageData.endTime = endTime;
    usageData.duration = endTime - usageData.startTime;
    usageData.nickname = nickname;

    // JSON形式でデータを送信
    fetch('https://your-gas-endpoint-url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(usageData)
    })
    .then(response => {
        console.log('使用履歴を送信しました');
    })
    .catch(error => {
        console.error('使用履歴の送信に失敗しました:', error);
    });
}

window.addEventListener('beforeunload', sendUsageData);

// 初期化処理
window.onload = function() {
    initEditor();
    initWebGL();
    getAudioDevices();
    initAudio();
    loadTemplate('default');
};

// テンプレートシェーダーの読み込み
function loadTemplate(name) {
    fetch(`shaders/templates/${name}.frag`)
        .then(response => response.text())
        .then(text => {
            editor.setValue(text);
            compileShader();
        })
        .catch(error => {
            console.error('テンプレートの読み込みに失敗しました:', error);
        });
}

// ポップアップウィンドウの実装（必要に応じて追加）

