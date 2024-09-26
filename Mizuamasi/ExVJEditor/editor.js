// editor.js

let editor;
let gl;
let program;
let uniforms = {};
let lastValidProgram = null;
let canvasWidth = 1920;
let canvasHeight = 1080;
let isEditorVisible = true;

let audioContext;
let analyser;
let microphoneStream;
let audioDataArray;
let audioTexture;

let startTime = performance.now();

window.onload = function() {
  initializeEditor();
  initializeGL();
  startTrackingUsage();
  setupEventListeners();
  loadSavedCode();
  getMicrophoneDevices();
};

/**
 * エディターの初期化
 */
function initializeEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById('shader-code'), {
    mode: 'x-shader/x-fragment',
    theme: 'dracula',
    lineNumbers: true,
    matchBrackets: true,
    autofocus: true
  });

  editor.on('change', debounce(compileShader, 500));
}

/**
 * WebGLの初期化
 */
function initializeGL() {
  const canvas = document.getElementById('render-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL2がサポートされていません。WebGLにフォールバックします。');
    gl = canvas.getContext('webgl');
    if (!gl) {
      alert('WebGLがサポートされていません。');
      return;
    }
  }
  resizeCanvas();
}

/**
 * シェーダーのコンパイルとプログラムのリンク
 */
function compileShader() {
  const shaderSource = editor.getValue();
  const vertexShaderSource = `
    attribute vec4 position;
    void main() {
      gl_Position = position;
    }
  `;

  // エラーメッセージをクリア
  document.getElementById('console-output').innerText = '';

  // シェーダーのコンパイルとエラーチェック
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, shaderSource);

  if (!vertexShader || !fragmentShader) return;

  // プログラムのリンク
  const newProgram = createProgram(vertexShader, fragmentShader);
  if (newProgram) {
    program = newProgram;
    lastValidProgram = newProgram;
    extractUniforms(shaderSource);
    render();
  } else {
    // エラーがある場合は最後に成功したプログラムを使用
    if (lastValidProgram) {
      program = lastValidProgram;
      render();
    }
  }
}

/**
 * シェーダーの作成
 * @param {number} type - シェーダーの種類
 * @param {string} source - シェーダーソースコード
 * @return {WebGLShader|null} - コンパイルされたシェーダーまたはnull
 */
function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    showError(error);
    return null;
  }
  return shader;
}

/**
 * プログラムの作成
 * @param {WebGLShader} vs - 頂点シェーダー
 * @param {WebGLShader} fs - フラグメントシェーダー
 * @return {WebGLProgram|null} - リンクされたプログラムまたはnull
 */
function createProgram(vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(prog);
    showError(error);
    return null;
  }
  return prog;
}

/**
 * シェーダーソースからUniform変数を抽出
 * @param {string} shaderSource - フラグメントシェーダーソースコード
 */
function extractUniforms(shaderSource) {
  const regex = /uniform\s+(float|vec[234])\s+(\w+);(?:\s*\/\/\s*option\s*(\{[^}]*\}))?/g;
  let match;
  uniforms = {};
  const controlContainer = document.getElementById('uniform-controls');
  controlContainer.innerHTML = '';

  while ((match = regex.exec(shaderSource)) !== null) {
    const type = match[1];
    const name = match[2];
    const options = match[3] ? JSON.parse(match[3]) : {};
    uniforms[name] = {
      type: type,
      value: getDefaultUniformValue(type),
      options: options
    };
    createUniformControl(name, type, options);
  }
}

/**
 * Uniform変数のデフォルト値を取得
 * @param {string} type - Uniform変数の型
 * @return {Array<number>} - デフォルト値
 */
function getDefaultUniformValue(type) {
  const size = parseInt(type.slice(-1)) || 1;
  return Array(size).fill(0.0);
}

/**
 * Uniformコントロールの作成
 * @param {string} name - Uniform変数の名前
 * @param {string} type - Uniform変数の型
 * @param {Object} options - オプション（最小値、最大値、ステップなど）
 */
function createUniformControl(name, type, options) {
  const controlContainer = document.getElementById('uniform-controls');
  const label = document.createElement('label');
  label.innerText = name;
  controlContainer.appendChild(label);

  const size = parseInt(type.slice(-1)) || 1;
  for (let i = 0; i < size; i++) {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = options.min || -1;
    input.max = options.max || 1;
    input.step = options.step || 0.0001;
    input.value = uniforms[name].value[i];
    input.oninput = function() {
      uniforms[name].value[i] = parseFloat(this.value);
      render();
    };
    controlContainer.appendChild(input);
  }
}

/**
 * レンダリング関数
 */
function render() {
  if (!program) return;

  updateAudioTexture();

  gl.useProgram(program);

  // 頂点バッファの設定
  const positionAttributeLocation = gl.getAttribLocation(program, 'position');
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
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // Uniform変数の設定
  for (const name in uniforms) {
    const location = gl.getUniformLocation(program, name);
    const value = uniforms[name].value;
    const type = uniforms[name].type;
    if (type === 'float') {
      gl.uniform1f(location, value[0]);
    } else if (type === 'vec2') {
      gl.uniform2fv(location, value);
    } else if (type === 'vec3') {
      gl.uniform3fv(location, value);
    } else if (type === 'vec4') {
      gl.uniform4fv(location, value);
    }
  }

  // 組み込みUniformの設定
  setBuiltInUniforms();
  setAudioTextureUniform();

  // 描画
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

/**
 * 組み込みUniformの設定
 */
function setBuiltInUniforms() {
  const currentTime = (performance.now() - startTime) / 1000;

  const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
  if (iResolutionLocation) {
    gl.uniform3f(iResolutionLocation, canvasWidth, canvasHeight, 1.0);
  }

  const iTimeLocation = gl.getUniformLocation(program, 'iTime');
  if (iTimeLocation) {
    gl.uniform1f(iTimeLocation, currentTime);
  }

  const iMouseLocation = gl.getUniformLocation(program, 'iMouse');
  if (iMouseLocation) {
    gl.uniform4f(iMouseLocation, mouseX, mouseY, mousePressed ? 1.0 : 0.0, 0.0);
  }
}

let mouseX = 0.0;
let mouseY = 0.0;
let mousePressed = false;

const canvas = document.getElementById('render-canvas');
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = canvasHeight - (e.clientY - rect.top);
});

canvas.addEventListener('mousedown', () => {
  mousePressed = true;
});

canvas.addEventListener('mouseup', () => {
  mousePressed = false;
});

/**
 * 使用時間のトラッキング開始
 * 5分ごとに使用時間と更新回数をサーバーに送信
 */
function startTrackingUsage() {
  setInterval(() => {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session) return;

    const usageTime = 300; // 5分（300秒）
    const updateCount = 1; // 1回の更新

    const data = new URLSearchParams();
    data.append('action', 'updateUsage');
    data.append('nickname', session.nickname);
    data.append('usageTime', usageTime);
    data.append('updateCount', updateCount);

    fetch('https://script.google.com/macros/s/AKfycbynrTZxEGbsEYWQSPzYlhV2VRW42krn2kwr6T74uJ0V7biEKbPcgE50B6mBX4LkyHBblw/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data.toString()
    }).catch(error => {
      console.error('使用時間トラッキングエラー:', error);
    });
  }, 300000); // 5分ごと
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  document.getElementById('save-btn').addEventListener('click', saveCode);
  document.getElementById('popup-btn').addEventListener('click', openPopup);
  document.getElementById('apply-resolution-btn').addEventListener('click', applyResolution);
  document.getElementById('toggle-editor-btn').addEventListener('click', toggleEditor);
  document.getElementById('microphone-select').addEventListener('change', startMicrophone);
}

/**
 * コードの保存
 * ローカルストレージに保存
 */
function saveCode() {
  const code = editor.getValue();
  localStorage.setItem('savedCode', code);
}

/**
 * 保存されたコードの読み込み
 */
function loadSavedCode() {
  const savedCode = localStorage.getItem('savedCode');
  if (savedCode) {
    editor.setValue(savedCode);
  } else {
    // 初期コードを設定
    editor.setValue(`
    // print関数の使い方
    // print(変数);
    
    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        // シェーダーコードをここに記述
    }
    `);
  }
}

/**
 * ポップアップウィンドウの開設とシェーダーコードの送信
 */
function openPopup() {
  const popup = window.open('', 'popupWindow', 'width=800,height=600');
  popup.document.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>ポップアップレンダリング結果</title>
      <style>
        body { margin: 0; background-color: #000; }
        canvas { display: block; }
      </style>
    </head>
    <body>
      <canvas id="popup-canvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
      <script>
        const canvas = document.getElementById('popup-canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          alert('WebGLがサポートされていません。');
        }
        
        // シェーダーコードを受け取る
        window.opener.postMessage({ type: 'getShaderCode' }, '*');
        
        window.addEventListener('message', function(event) {
          if (event.data.type === 'shaderCode') {
            compileAndRender(event.data.code, gl, canvas.width, canvas.height);
          }
        });
        
        /**
         * シェーダーのコンパイルとレンダリング
         * @param {string} shaderSource - フラグメントシェーダーソースコード
         * @param {WebGLRenderingContext} gl - WebGLコンテキスト
         * @param {number} width - キャンバスの幅
         * @param {number} height - キャンバスの高さ
         */
        function compileAndRender(shaderSource, gl, width, height) {
          const vertexShaderSource = \`
            attribute vec4 position;
            void main() {
              gl_Position = position;
            }
          \`;
          
          const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
          const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shaderSource);
          
          if (!vertexShader || !fragmentShader) return;
          
          const program = createProgram(gl, vertexShader, fragmentShader);
          if (!program) return;
          
          gl.useProgram(program);
          
          // 頂点バッファの設定
          const positionAttributeLocation = gl.getAttribLocation(program, 'position');
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
          gl.enableVertexAttribArray(positionAttributeLocation);
          gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
          
          // 組み込みUniformの設定
          setBuiltInUniforms(gl, program, width, height);
          
          // 描画
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        /**
         * 組み込みUniformの設定
         * @param {WebGLRenderingContext} gl - WebGLコンテキスト
         * @param {WebGLProgram} program - シェーダープログラム
         * @param {number} width - キャンバスの幅
         * @param {number} height - キャンバスの高さ
         */
        function setBuiltInUniforms(gl, program, width, height) {
          const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
          if (iResolutionLocation) {
            gl.uniform3f(iResolutionLocation, width, height, 1.0);
          }

          const iTimeLocation = gl.getUniformLocation(program, 'iTime');
          if (iTimeLocation) {
            const startTime = performance.now();
            gl.uniform1f(iTimeLocation, (performance.now() - startTime) / 1000);
          }

          const iMouseLocation = gl.getUniformLocation(program, 'iMouse');
          if (iMouseLocation) {
            gl.uniform4f(iMouseLocation, 0.0, 0.0, 0.0, 0.0); // マウス情報を送信する場合は適宜変更
          }
        }

        /**
         * シェーダーの作成
         * @param {WebGLRenderingContext} gl - WebGLコンテキスト
         * @param {number} type - シェーダーの種類
         * @param {string} source - シェーダーソースコード
         * @return {WebGLShader|null} - コンパイルされたシェーダーまたはnull
         */
        function createShader(gl, type, source) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            console.error('シェーダーコンパイルエラー:', error);
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        }

        /**
         * プログラムの作成
         * @param {WebGLShader} vs - 頂点シェーダー
         * @param {WebGLShader} fs - フラグメントシェーダー
         * @return {WebGLProgram|null} - リンクされたプログラムまたはnull
         */
        function createProgram(gl, vs, fs) {
          const program = gl.createProgram();
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);
          
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            console.error('プログラムリンクエラー:', error);
            gl.deleteProgram(program);
            return null;
          }
          return program;
        }
      </script>
    </body>
    </html>
  `);

  // シェーダーコードをポップアップに送信
  window.addEventListener('message', function(event) {
    if (event.data.type === 'getShaderCode') {
      popup.postMessage({ type: 'shaderCode', code: editor.getValue() }, '*');
    }
  }, { once: true });
}

/**
 * 解像度の適用
 */
function applyResolution() {
  const widthInput = document.getElementById('resolution-width');
  const heightInput = document.getElementById('resolution-height');
  canvasWidth = parseInt(widthInput.value);
  canvasHeight = parseInt(heightInput.value);
  resizeCanvas();
}

/**
 * キャンバスのリサイズ
 */
function resizeCanvas() {
  const canvas = document.getElementById('render-canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

/**
 * エディターの表示/非表示の切り替え
 */
function toggleEditor() {
  isEditorVisible = !isEditorVisible;
  const editorContainer = document.getElementById('editor-container');
  if (isEditorVisible) {
    editorContainer.classList.remove('hidden');
  } else {
    editorContainer.classList.add('hidden');
  }
}

/**
 * エラーメッセージの表示
 * @param {string} error - エラーメッセージ
 */
function showError(error) {
  document.getElementById('console-output').innerText = error;
  // エディター内でエラー箇所をハイライトする処理を追加可能
}

/**
 * デバウンス関数
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @return {Function} - デバウンスされた関数
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => { func.apply(this, args); }, wait);
  };
}

/**
 * マイク入力の処理
 */
async function getMicrophoneDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("このブラウザではenumerateDevicesがサポートされていません。");
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    const microphoneSelect = document.getElementById('microphone-select');
    audioInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `マイクデバイス ${microphoneSelect.length}`;
      microphoneSelect.appendChild(option);
    });
  } catch (err) {
    console.error('デバイス取得エラー:', err);
  }
}

/**
 * マイクの開始
 */
async function startMicrophone() {
  const deviceId = document.getElementById('microphone-select').value;
  if (!deviceId) return;

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
  }

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId
      }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(microphoneStream);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    audioDataArray = new Uint8Array(bufferLength);

    createAudioTexture();
  } catch (err) {
    console.error('マイクへのアクセスが拒否されました。', err);
  }
}

/**
 * オーディオテクスチャの作成
 */
function createAudioTexture() {
  audioTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, audioTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    audioDataArray.length,
    1,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    null
  );
}

/**
 * オーディオテクスチャの更新
 */
function updateAudioTexture() {
  if (analyser && audioDataArray) {
    analyser.getByteFrequencyData(audioDataArray);

    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      audioDataArray.length,
      1,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      audioDataArray
    );
  }
}

/**
 * オーディオテクスチャUniformの設定
 */
function setAudioTextureUniform() {
  const iChannel0Location = gl.getUniformLocation(program, 'iChannel0');
  if (iChannel0Location) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.uniform1i(iChannel0Location, 0);
  }
}
