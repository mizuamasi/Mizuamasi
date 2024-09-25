// main.js

let editor;
let userEmail = null;
let idToken = null;
let uniformValues = {};

// キャンバスとWebGLコンテキスト
let canvas, gl;
let program = null;
let a_position = null;

// 初期化
window.onload = function() {
    initializeEditor();
    initializeCanvas();
    initializeAudio();
    setupEventListeners();
};

// CodeMirrorエディターの初期化
function initializeEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
        lineNumbers: true,
        mode: "x-shader/x-fragment",
        theme: "default"
    });

    editor.on('change', () => {
        parseUniforms(editor.getValue());
        logAction('edit');
        compileAndRenderShader();
    });

    // ローカルストレージから保存されたコードを読み込む
    const savedCode = localStorage.getItem('savedCode');
    if (savedCode) {
        editor.setValue(savedCode);
    }
}

// キャンバスの初期化
function initializeCanvas() {
    canvas = document.getElementById('visualCanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        alert('WebGLがサポートされていません。');
        return;
    }

    // キャンバスサイズの調整
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        compileAndRenderShader();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 描画ループ
    function renderLoop() {
        render();
        requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);
}

// Web Audio APIの初期化（将来的な機能拡張用）
function initializeAudio() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            // 音声データの解析やビジュアルへの反映はここで実装
        })
        .catch(err => {
            log('音声入力に失敗しました: ' + err.message);
        });
}

// イベントリスナーの設定
function setupEventListeners() {
    document.getElementById('saveButton').addEventListener('click', () => {
        saveToCache();
    });

    document.getElementById('visualButton').addEventListener('click', () => {
        openVisualWindow();
    });

    document.getElementById('signOutButton').addEventListener('click', signOut);
}

// Googleサインイン成功時のコールバック
function onSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();
    userEmail = profile.getEmail();
    idToken = googleUser.getAuthResponse().id_token;
    document.getElementById('signOutButton').style.display = 'block';

    // バックエンドにログイン情報を送信
    fetchBackend('login', { token: idToken });
}

// サインアウト処理
function signOut() {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
        log('ユーザーがサインアウトしました。');
        userEmail = null;
        idToken = null;
        document.getElementById('signOutButton').style.display = 'none';
    });
}

// ログを画面に表示
function log(message) {
    const logArea = document.getElementById('log');
    logArea.innerHTML += message + '<br>';
    logArea.scrollTop = logArea.scrollHeight;
}

// ユーザーアクションをログに送信
function logAction(action, code = '') {
    if (!idToken) return;
    fetchBackend('logAction', { token: idToken, actionType: action, code: code });
}

// バックエンドとの通信
function fetchBackend(action, data) {
    const urlMap = {
        'login': CONFIG.GAS_URL,
        'logAction': CONFIG.GAS_URL
        // 他のエンドポイントを必要に応じて追加
    };

    fetch(urlMap[action], {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                if (action === 'login') {
                    log(`ユーザー ${data.email} がログインしました。`);
                }
                // 他のアクションの処理
            } else {
                log(`エラー: ${data.message}`);
            }
        })
        .catch(error => {
            log('バックエンドとの通信に失敗しました: ' + error.message);
        });
}

// コードをローカルストレージに保存
function saveToCache() {
    const code = editor.getValue();
    localStorage.setItem('savedCode', code);
    log('コードがキャッシュに保存されました。');
    logAction('save', code);
}

// ビジュアルウィンドウを開くまたはフォーカスする
let visualWindow = null;
function openVisualWindow() {
    if (!visualWindow || visualWindow.closed) {
        visualWindow = window.open('', 'VisualWindow', 'width=800,height=600');
        // ポップアップウィンドウにHTMLを動的に書き込む
        visualWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <title>ビジュアル表示</title>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                        background-color: #000;
                        position: relative;
                        z-index: 0;
                    }
                    #visualCanvas {
                        width: 100%;
                        height: 100%;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <canvas id="visualCanvas"></canvas>
                <script>
                    const canvas = document.getElementById('visualCanvas');
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

                    if (!gl) {
                        alert('WebGLがサポートされていません。');
                    }

                    // キャンバスサイズの調整
                    function resizeCanvas() {
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                        compileAndRenderShader();
                    }
                    window.addEventListener('resize', resizeCanvas);
                    resizeCanvas();

                    // シェーダーのコンパイルとプログラムの作成
                    let program = null;
                    let a_position = null;

                    function compileAndRenderShader() {
                        if (!gl) return;

                        const vertexShaderSource = \`
                            attribute vec4 a_position;
                            void main() {
                                gl_Position = a_position;
                            }
                        \`;

                        let fragmentShaderSource = '';

                        // メインウィンドウからシェーダーコードを受信
                        window.addEventListener('message', (event) => {
                            const data = event.data;
                            if (data.shaderCode) {
                                fragmentShaderSource = data.shaderCode;
                                updateProgram();
                            }
                            if (data.uniforms) {
                                uniforms = data.uniforms;
                                updateUniforms();
                            }
                        });

                        // シェーダーのコンパイル
                        function compileShader(gl, source, type) {
                            const shader = gl.createShader(type);
                            gl.shaderSource(shader, source);
                            gl.compileShader(shader);
                            const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
                            if (success) {
                                return shader;
                            }

                            const error = gl.getShaderInfoLog(shader);
                            postLog(\`シェーダーのコンパイルエラー: \${error}\`);
                            gl.deleteShader(shader);
                            return null;
                        }

                        // プログラムのリンク
                        function createProgram(gl, vertexShader, fragmentShader) {
                            const program = gl.createProgram();
                            gl.attachShader(program, vertexShader);
                            gl.attachShader(program, fragmentShader);
                            gl.linkProgram(program);
                            const success = gl.getProgramParameter(program, gl.LINK_STATUS);
                            if (success) {
                                return program;
                            }

                            const error = gl.getProgramInfoLog(program);
                            postLog(\`プログラムのリンクエラー: \${error}\`);
                            gl.deleteProgram(program);
                            return null;
                        }

                        // プログラムの更新
                        function updateProgram() {
                            if (program) {
                                gl.deleteProgram(program);
                            }

                            const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
                            const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

                            if (!vertexShader || !fragmentShader) {
                                return;
                            }

                            program = createProgram(gl, vertexShader, fragmentShader);

                            if (!program) {
                                return;
                            }

                            gl.useProgram(program);

                            // 配列バッファの設定
                            const positionBuffer = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                            const positions = [
                                -1, -1,
                                 1, -1,
                                -1,  1,
                                -1,  1,
                                 1, -1,
                                 1,  1,
                            ];
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

                            a_position = gl.getAttribLocation(program, 'a_position');
                            gl.enableVertexAttribArray(a_position);
                            gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

                            updateUniforms();
                        }

                        // ユニフォーム変数
                        let uniforms = {};

                        // ユニフォームの更新
                        function updateUniforms() {
                            if (!gl || !program) return;

                            for (const name in uniforms) {
                                const location = gl.getUniformLocation(program, name);
                                if (location === null) continue;
                                const value = uniforms[name];
                                if (typeof value === 'number') {
                                    gl.uniform1f(location, value);
                                } else if (Array.isArray(value)) {
                                    if (value.length === 2) {
                                        gl.uniform2fv(location, value);
                                    } else if (value.length === 3) {
                                        gl.uniform3fv(location, value);
                                    } else if (value.length === 4) {
                                        gl.uniform4fv(location, value);
                                    }
                                }
                            }
                        }

                        // レンダリング
                        function render() {
                            if (!gl || !program) return;

                            gl.clearColor(0, 0, 0, 1);
                            gl.clear(gl.COLOR_BUFFER_BIT);
                            gl.drawArrays(gl.TRIANGLES, 0, 6);
                        }

                        // 描画ループ
                        function renderLoop() {
                            render();
                            requestAnimationFrame(renderLoop);
                        }
                        requestAnimationFrame(renderLoop);

                        // エラーをメインウィンドウに送信
                        function postLog(message) {
                            window.opener.postMessage({ log: message }, '*');
                        }
                    }

                    compileAndRenderShader();
                </script>
            </body>
            </html>
        `);
    }
}

// シェーダーのコンパイルとレンダリング
function compileAndRenderShader() {
    if (!gl) return;

    const vertexShaderSource = `
        attribute vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    let fragmentShaderSource = editor.getValue();

    // シェーダーのコンパイル
    function compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        const error = gl.getShaderInfoLog(shader);
        log(`シェーダーのコンパイルエラー: ${error}`);
        gl.deleteShader(shader);
        return null;
    }

    // プログラムのリンク
    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }

        const error = gl.getProgramInfoLog(program);
        log(`プログラムのリンクエラー: ${error}`);
        gl.deleteProgram(program);
        return null;
    }

    if (program) {
        gl.deleteProgram(program);
    }

    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
        return;
    }

    program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
        return;
    }

    gl.useProgram(program);

    // 配列バッファの設定
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    a_position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // ユニフォームの更新
    updateUniforms();

    // ポップアップウィンドウにシェーダーコードとユニフォームを送信
    if (visualWindow && !visualWindow.closed) {
        visualWindow.postMessage({ shaderCode: fragmentShaderSource, uniforms: uniformValues }, '*');
    }
}

// ユニフォーム変数の更新
function updateUniforms() {
    if (!gl || !program) return;

    for (const name in uniformValues) {
        const location = gl.getUniformLocation(program, name);
        if (location === null) continue;
        const value = uniformValues[name];
        if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (Array.isArray(value)) {
            if (value.length === 2) {
                gl.uniform2fv(location, value);
            } else if (value.length === 3) {
                gl.uniform3fv(location, value);
            } else if (value.length === 4) {
                gl.uniform4fv(location, value);
            }
        }
    }
}

// レンダリング
function render() {
    if (!gl || !program) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// ユニフォーム変数の解析とコントロールパネルの更新
function parseUniforms(code) {
    const uniformPattern = /uniform\s+\w+\s+(\w+)\s*;/g;
    let match;
    const uniforms = [];
    while ((match = uniformPattern.exec(code)) !== null) {
        const uniformName = match[1];
        // 既に存在する場合はスキップ
        if (uniforms.some(u => u.name === uniformName)) continue;
        uniforms.push({ name: uniformName, value: uniformValues[uniformName] || 0.5, min: 0, max: 1, step: 0.01 });
    }
    updateControlPanel(uniforms);
}

// コントロールパネルの更新
function updateControlPanel(uniforms) {
    const panel = document.getElementById('uniformControls');
    panel.innerHTML = ''; // 既存の内容をクリア

    uniforms.forEach(variable => {
        // スライダーの作成
        const container = document.createElement('div');
        container.className = 'uniform-control';

        const label = document.createElement('label');
        label.textContent = variable.name;
        label.htmlFor = `slider-${variable.name}`;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `slider-${variable.name}`;
        slider.min = variable.min;
        slider.max = variable.max;
        slider.step = variable.step;
        slider.value = uniformValues[variable.name] || variable.value;

        // スライダー値の表示
        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = slider.value;

        // スライダーの変更イベント
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            uniformValues[variable.name] = value;
            valueDisplay.textContent = value;
            updateUniforms();
            // ポップアップウィンドウにユニフォームを送信
            if (visualWindow && !visualWindow.closed) {
                visualWindow.postMessage({ uniforms: uniformValues }, '*');
            }
        });

        container.appendChild(label);
        container.appendChild(slider);
        container.appendChild(valueDisplay);
        panel.appendChild(container);
    });
}

// ユニフォーム変数をビジュアルウィンドウに送信
function sendUniforms() {
    if (visualWindow && !visualWindow.closed) {
        visualWindow.postMessage({ uniforms: uniformValues }, '*');
    }
}

// メッセージ受信時の処理（ログの受信）
window.addEventListener('message', (event) => {
    const data = event.data;
    if (data.log) {
        log(`ビジュアルウィンドウ: ${data.log}`);
    }
});
