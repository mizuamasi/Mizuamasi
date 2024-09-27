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
let popupWindow = null;

let mouseX = 0.0;
let mouseY = 0.0;
let mousePressed = false;

// 最大画面解像度を取得
const maxResolution = {
  width: window.screen.width,
  height: window.screen.height
};

window.onload = function() {
  initializeEditor();
  initializeGL();
  setupEventListeners();
  setupLoadModal();
  loadSavedCode();
  getMicrophoneDevices();
  
  // ログインセッションの確認
  const session = JSON.parse(localStorage.getItem('session'));
  if (session && session.isLoggedIn) {
    startTrackingUsage();
    showMainContainer();
  } else {
    // 認証画面を表示
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('main-container').style.display = 'none';
  }
  
  // サンプルコードの自動読み込み
  loadSampleCodeFromURL('SampleCode/sample1.frag');
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
 * WebGL2 の初期化
 */
function initializeGL() {
  const canvas = document.getElementById('render-canvas');
  gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  if (!gl) {
    alert('WebGL2がサポートされていません。このアプリケーションはWebGL2を必要とします。');
    return;
  }
  resizeCanvas();

  // マウスイベントの設定
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
}

/**
 * シェーダーのコンパイルとプログラムのリンク
 */
function compileShader() {
  let shaderSource = editor.getValue();

  // main関数の自動挿入とインストルメントを一度だけ実行する
  if (!shaderSource.includes('// [INJECTED CODE START]')) {
    // GLSLバージョン指定を追加
    shaderSource = `#version 300 es
precision mediump float;
${shaderSource}`;

    // print関数のインストルメントを追加
    shaderSource = injectPrintFunction(shaderSource);

    // main関数の自動挿入
    if (!/void\s+main\s*\(/.test(shaderSource)) {
      shaderSource += `

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  mainImage(fragColor, fragCoord);
}`;
    }
  }

  const vertexShaderSource = `#version 300 es
precision mediump float;
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

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
 */
function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    showError(error);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * プログラムの作成
 */
function createProgram(vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(prog);
    showError(error);
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

/**
 * GLSLコード内のprint関数をインストルメント
 */
function injectPrintFunction(shaderSource) {
  // 既にインストルメントされている場合は何もしない
  if (shaderSource.includes('// [INJECTED CODE START]')) {
    return shaderSource;
  }

  // インストルメントコードの挿入
  const printFunction = `
// [INJECTED CODE START]
out vec4 fragColor;
vec4 printValues[10];
int printCount = 0;

void print(float value) {
  if (printCount < 10) {
    printValues[printCount] = vec4(value, 0.0, 0.0, 0.0);
    printCount++;
  }
}

void print(vec2 value) {
  if (printCount < 10) {
    printValues[printCount] = vec4(value, 0.0, 0.0);
    printCount++;
  }
}

void print(vec3 value) {
  if (printCount < 10) {
    printValues[printCount] = vec4(value, 0.0);
    printCount++;
  }
}

void print(vec4 value) {
  if (printCount < 10) {
    printValues[printCount] = value;
    printCount++;
  }
}

void print(float value, vec2 coord) {
  if (distance(gl_FragCoord.xy, coord) < 1.0 && printCount < 10) {
    printValues[printCount] = vec4(value, 0.0, 0.0, 0.0);
    printCount++;
  }
}

void print(vec2 value, vec2 coord) {
  if (distance(gl_FragCoord.xy, coord) < 1.0 && printCount < 10) {
    printValues[printCount] = vec4(value, 0.0, 0.0);
    printCount++;
  }
}

void print(vec3 value, vec2 coord) {
  if (distance(gl_FragCoord.xy, coord) < 1.0 && printCount < 10) {
    printValues[printCount] = vec4(value, 0.0);
    printCount++;
  }
}

void print(vec4 value, vec2 coord) {
  if (distance(gl_FragCoord.xy, coord) < 1.0 && printCount < 10) {
    printValues[printCount] = value;
    printCount++;
  }
}

// user_mainImage関数の宣言
void user_mainImage(out vec4 fragColor, in vec2 fragCoord);

// main関数の定義
void main() {
  printCount = 0; // 毎フレームリセット
  user_mainImage(fragColor, fragCoord.xy);

  // printValuesをfragColorに追加
  for(int i = 0; i < 10; i++) {
    fragColor += printValues[i];
  }
}
// [INJECTED CODE END]
`;

  shaderSource = shaderSource.replace(/void\s+mainImage\s*\(/, `${printFunction}\nvoid user_mainImage(`);

  return shaderSource;
}

/**
 * Uniform変数を抽出
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
 */
function getDefaultUniformValue(type) {
  const size = parseInt(type.slice(-1)) || 1;
  return Array(size).fill(0.0);
}

/**
 * Uniformコントロールの作成
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
    input.min = options.min !== undefined ? options.min : -1;
    input.max = options.max !== undefined ? options.max : 1;
    input.step = options.step !== undefined ? options.step : 0.0001;
    input.value = uniforms[name].value[i];
    input.title = `${name}.${i+1}`;
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

  // オーディオテクスチャUniformの設定
  setAudioTextureUniform();

  // 描画
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // printValuesの取得とコンソール出力
  readPrintValues();

  requestAnimationFrame(render);

  // ポップアップへの送信
  if (popupWindow && !popupWindow.closed) {
    // レンダリング結果を画像として取得
    const dataURL = gl.canvas.toDataURL();
    popupWindow.postMessage({ type: 'renderResult', data: dataURL }, '*');
  }
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

/**
 * オーディオテクスチャUniformの設定
 */
function setAudioTextureUniform() {
  const iChannel0Location = gl.getUniformLocation(program, 'iChannel0');
  if (iChannel0Location && audioTexture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.uniform1i(iChannel0Location, 0);
  }
}

/**
 * printValuesの取得とコンソール出力
 */
function readPrintValues() {
  // マウス位置のピクセルを取得
  const x = Math.floor(mouseX);
  const y = Math.floor(mouseY);

  // ピクセルがキャンバス範囲内か確認
  if (x < 0 || x >= gl.canvas.width || y < 0 || y >= gl.canvas.height) {
    return;
  }

  // フロートテクスチャを有効にする必要があるため、WebGL2のみ対応
  if (!gl.getExtension('EXT_color_buffer_float')) {
    console.warn('EXT_color_buffer_floatがサポートされていません。print機能が無効です。');
    return;
  }

  const pixels = new Float32Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, pixels);

  const r = pixels[0];
  const g = pixels[1];
  const b = pixels[2];
  const a = pixels[3];

  const consoleOutput = document.getElementById('console-output');
  consoleOutput.innerText = `値: ${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${a.toFixed(2)}`;
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
    microphoneSelect.innerHTML = '<option value="">マイクを選択</option>'; // 初期化
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
 * 使用時間のトラッキング開始
 */
function startTrackingUsage() {
  setInterval(() => {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.isLoggedIn) return;

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
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        console.log('使用時間トラッキング成功:', result.message);
      } else {
        console.error('使用時間トラッキング失敗:', result.message);
      }
    })
    .catch(error => {
      console.error('使用時間トラッキングエラー:', error);
    });
  }, 300000); // 5分ごとに実行
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  const saveBtn = document.getElementById('save-btn');
  const loadBtn = document.getElementById('load-btn');
  const loadSavedBtn = document.getElementById('load-saved-btn');
  const popupBtn = document.getElementById('popup-btn');
  const applyResolutionBtn = document.getElementById('apply-resolution-btn');
  const toggleEditorBtn = document.getElementById('toggle-editor-btn');
  const microphoneSelect = document.getElementById('microphone-select');
  const sampleSelect = document.getElementById('sample-select');
  const continueWithoutTrackingBtn = document.getElementById('continue-without-tracking-btn');

  if (saveBtn) {
    saveBtn.addEventListener('click', saveCode);
  }

  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const modal = document.getElementById('load-modal');
      updateSavedShadersList();
      modal.classList.remove('hidden');
    });
  }

  if (loadSavedBtn) {
    loadSavedBtn.addEventListener('click', loadSavedCodeFromList);
  }

  if (popupBtn) {
    popupBtn.addEventListener('click', openPopup);
  }

  if (applyResolutionBtn) {
    applyResolutionBtn.addEventListener('click', applyResolution);
  }

  if (toggleEditorBtn) {
    toggleEditorBtn.addEventListener('click', toggleEditor);
  }

  if (microphoneSelect) {
    microphoneSelect.addEventListener('change', startMicrophone);
  }

  if (sampleSelect) {
    sampleSelect.addEventListener('change', loadSampleCode);
  }

  if (continueWithoutTrackingBtn) {
    continueWithoutTrackingBtn.addEventListener('click', () => {
      // ログイン画面を非表示にしてエディターを表示
      document.getElementById('auth-container').style.display = 'none';
      showMainContainer();

      // トラッキングを無効化
      localStorage.removeItem('session');
    });
  }

  // モーダルの閉じるボタン設定
  const modal = document.getElementById('load-modal');
  const closeBtn = modal.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // モーダル外クリックで閉じる
  window.addEventListener('click', (event) => {
    if (event.target == modal) {
      modal.classList.add('hidden');
    }
  });
}

/**
 * サンプルコードの読み込み
 */
async function loadSampleCode() {
  const sampleSelect = document.getElementById('sample-select');
  const selectedSample = sampleSelect.value;

  if (selectedSample === '') return;

  try {
    const response = await fetch(selectedSample);
    if (!response.ok) {
      throw new Error(`サンプルコードの読み込みに失敗しました: ${response.statusText}`);
    }
    const shaderCode = await response.text();
    editor.setValue(shaderCode);
    alert('サンプルコードが読み込まれました。');
  } catch (error) {
    console.error('サンプルコード読み込みエラー:', error);
    alert('サンプルコードの読み込み中にエラーが発生しました。');
  }
}

/**
 * 指定されたURLからサンプルコードを読み込む
 * @param {string} url - サンプルコードのURL
 */
async function loadSampleCodeFromURL(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`サンプルコードの読み込みに失敗しました: ${response.statusText}`);
    }
    const shaderCode = await response.text();
    editor.setValue(shaderCode);
    alert(`サンプルコード「${url}」が自動的に読み込まれました。`);
  } catch (error) {
    console.error('サンプルコード読み込みエラー:', error);
    alert('サンプルコードの読み込み中にエラーが発生しました。');
  }
}

/**
 * コードの保存
 */
function saveCode() {
  const code = editor.getValue();
  const codeName = prompt('保存するコードの名前を入力してください:', 'MyShader');

  if (codeName === null) {
    // ユーザーがキャンセルした場合
    return;
  }

  const trimmedName = codeName.trim();
  if (trimmedName === '') {
    alert('コード名を入力してください。');
    return;
  }

  // 保存
  localStorage.setItem(`shader_${trimmedName}`, code);
  alert(`コード「${trimmedName}」が保存されました。`);

  // 保存リストを更新
  updateSavedShadersList();
}

/**
 * 保存されたシェーダーコードのリストを更新
 */
function updateSavedShadersList() {
  const savedSelect = document.getElementById('saved-select');
  savedSelect.innerHTML = '<option value="">保存済みコードを選択</option>';

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('shader_')) {
      const option = document.createElement('option');
      option.value = key;
      option.text = key.replace('shader_', '');
      savedSelect.appendChild(option);
    }
  }
}

/**
 * 保存されたコードの読み込み
 */
function loadSavedCodeFromList() {
  const savedSelect = document.getElementById('saved-select');
  const selectedKey = savedSelect.value;

  if (selectedKey === '') {
    alert('ロードするコードを選択してください。');
    return;
  }

  const code = localStorage.getItem(selectedKey);
  if (code) {
    editor.setValue(code);
    alert(`コード「${selectedKey.replace('shader_', '')}」がロードされました。`);
    document.getElementById('load-modal').classList.add('hidden');
  } else {
    alert('選択されたコードが見つかりません。');
  }
}

/**
 * ロードモーダルの設定
 */
function setupLoadModal() {
  const modal = document.getElementById('load-modal');
  const closeBtn = modal.querySelector('.close');

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // モーダル外クリックで閉じる
  window.addEventListener('click', (event) => {
    if (event.target == modal) {
      modal.classList.add('hidden');
    }
  });
}

/**
 * ポップアップウィンドウの開設とレンダリング結果の送信
 */
function openPopup() {
  if (popupWindow && !popupWindow.closed) {
    popupWindow.focus();
    return;
  }

  popupWindow = window.open('', 'popupWindow', `width=${maxResolution.width},height=${maxResolution.height}`);

  // ポップアップウィンドウにHTMLを挿入
  popupWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>ポップアップレンダリング結果</title>
      <style>
        body { margin: 0; background-color: #000; }
        img { width: 100%; height: 100%; object-fit: contain; }
      </style>
    </head>
    <body>
      <img id="render-result" src="" alt="Render Result">
      <script>
        window.addEventListener('message', function(event) {
          if (event.data.type === 'renderResult') {
            const img = document.getElementById('render-result');
            img.src = event.data.data;
          }
        });
      </script>
    </body>
    </html>
  `);

  // ポップアップの解像度に合わせてエディターの解像度も調整
  canvasWidth = maxResolution.width;
  canvasHeight = maxResolution.height;
  resizeCanvas();
}

/**
 * 解像度の適用
 */
function applyResolution() {
  const widthInput = document.getElementById('resolution-width');
  const heightInput = document.getElementById('resolution-height');
  const newWidth = parseInt(widthInput.value);
  const newHeight = parseInt(heightInput.value);

  if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
    alert('有効な解像度を入力してください。');
    return;
  }

  canvasWidth = newWidth;
  canvasHeight = newHeight;
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
  const consoleContainer = document.getElementById('console-container');
  if (isEditorVisible) {
    editorContainer.classList.remove('hidden');
    consoleContainer.classList.remove('hidden');
  } else {
    editorContainer.classList.add('hidden');
    consoleContainer.classList.add('hidden');
  }
}

/**
 * エラーメッセージの表示
 */
function showError(error) {
  document.getElementById('console-output').innerText = `エラー: ${error}`;
}

/**
 * デバウンス関数
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => { func.apply(this, args); }, wait);
  };
}

/**
 * ポップアップでのレンダリング結果の受信（不要な場合は削除可）
 */
// この部分は不要です。ポップアップ側で処理します。

/**
 * printValuesの取得とコンソール出力
 */
function readPrintValues() {
  // マウス位置のピクセルを取得
  const x = Math.floor(mouseX);
  const y = Math.floor(mouseY);

  // ピクセルがキャンバス範囲内か確認
  if (x < 0 || x >= gl.canvas.width || y < 0 || y >= gl.canvas.height) {
    return;
  }

  // フロートテクスチャを有効にする必要があるため、WebGL2のみ対応
  if (!gl.getExtension('EXT_color_buffer_float')) {
    console.warn('EXT_color_buffer_floatがサポートされていません。print機能が無効です。');
    return;
  }

  const pixels = new Float32Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, pixels);

  const r = pixels[0];
  const g = pixels[1];
  const b = pixels[2];
  const a = pixels[3];

  const consoleOutput = document.getElementById('console-output');
  consoleOutput.innerText = `値: ${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, ${a.toFixed(2)}`;
}

/**
 * コントロールコンテナの表示
 */
function showMainContainer() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('main-container').classList.remove('hidden');
}

/**
 * 使用時間のトラッキング開始
 */
function startTrackingUsage() {
  setInterval(() => {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.isLoggedIn) return;

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
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        console.log('使用時間トラッキング成功:', result.message);
      } else {
        console.error('使用時間トラッキング失敗:', result.message);
      }
    })
    .catch(error => {
      console.error('使用時間トラッキングエラー:', error);
    });
});
}
