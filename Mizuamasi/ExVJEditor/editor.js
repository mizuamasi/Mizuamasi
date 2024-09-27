// editor.js

let editor;
let gl;
let program;
let lastValidProgram = null;
let canvasWidth = 800; // 初期値
let canvasHeight = 600; // 初期値
let isEditorVisible = true;
let isTracking = true;

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

const maxResolution = {
  width: window.screen.width,
  height: window.screen.height
};

window.onload = function() {
  initializeEditor();
  initializeGL();
  setupEventListeners();
  loadCode();
  getMicrophoneDevices();
  
  // 認証が完了しているか確認
  const session = JSON.parse(localStorage.getItem('session'));
  if (session && session.isLoggedIn) {
    showMainContainer();
    if (isTracking) {
      startTrackingUsage();
      updateTrackingStatus(true);
    }
  }
  //  else {
  //   alert('認証されていません。ログイン画面に戻ります。');
  //   window.location.href = 'login.html'; // 'index.html' から 'login.html' に変更
  // }
  
  // キャンバス解像度設定イベントリスナー
  const setResolutionBtn = document.getElementById('set-resolution-btn');
  if (setResolutionBtn) {
    setResolutionBtn.addEventListener('click', setCanvasResolution);
  }
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

  // エディターの背景にWebGLレンダリング結果を設定
  render(); // 初期レンダリング
}

/**
 * シェーダーのコンパイルとプログラムのリンク
 */
function compileShader() {
  let shaderSource = editor.getValue();

  // 精度宣言が存在しない場合、追加する
  if (!/precision\s+mediump\s+float\s*;/.test(shaderSource)) {
    shaderSource = 'precision mediump float;\n' + shaderSource;
  }

  // #version が存在しない場合、#version 300 es を追加
  if (!/^#version\s+\d+\s+\w+/.test(shaderSource)) {
    shaderSource = '#version 300 es\n\n\n\n' + shaderSource;
  }

  // WebGL 2.0では出力変数を宣言する必要があります
  // 既に出力変数が定義されていない場合、追加します
  const hasFragColor = /out\s+vec4\s+fragColor\s*;/.test(shaderSource);
  if (!hasFragColor) {
    shaderSource = shaderSource.replace(/void\s+mainImage\s*\(/, 'out vec4 fragColor;\nvoid mainImage(');
  }

  // シェーダー内に main 関数が存在するか確認
  const hasMain = /void\s+main\s*\(/.test(shaderSource);

  if (!hasMain) {
    // main 関数が存在しない場合、mainImage を呼び出す main 関数を追加
    shaderSource += `
void main() {
    mainImage(fragColor, fragCoord);
}
`;
  }

  // シェーダー内に 'fragCoord' を定義していない場合、定義を追加
  const hasFragCoord = /in\s+vec2\s+fragCoord\s*;/.test(shaderSource);
  if (!hasFragCoord) {
    shaderSource = shaderSource.replace(/void\s+mainImage\s*\(/, 'in vec2 fragCoord;\nvoid mainImage(');
  }

  // シェーダー内に 'fragCoord' を宣言しているか確認
  const hasFragCoordDeclaration = /in\s+vec2\s+fragCoord\s*;/.test(shaderSource);

  if (!hasFragCoordDeclaration) {
    // 'fragCoord' の宣言がない場合、追加
    shaderSource = shaderSource.replace(/void\s+main\s*\(/, 'in vec2 fragCoord;\nvoid main(');
  }

  document.getElementById('console-output').innerText = '';

  const vertexShaderSource = `#version 300 es
precision highp float;
layout(location = 0) in vec2 position;
out vec2 fragCoord;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  fragCoord = (position + 1.0) / 2.0 * vec2(${canvasWidth.toFixed(1)}, ${canvasHeight.toFixed(1)});
}`;

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, shaderSource);

  if (!vertexShader || !fragmentShader) return;

  const newProgram = createProgram(vertexShader, fragmentShader);
  if (newProgram) {
    program = newProgram;
    lastValidProgram = newProgram;
    render();
    // 自動保存を削除
    // saveCodeToLocalStorage(); // ここをコメントアウトまたは削除
  } else {
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
 * レンダリング関数
 * ポップアップへのレンダリング結果送信を最適化
 */
let lastPopupUpdate = 0;
const popupUpdateInterval = 0; // 1秒ごとに送信

function render() {
  if (!program) return;

  updateAudioTexture();

  gl.useProgram(program);

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

  setBuiltInUniforms();

  setAudioTextureUniform();

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1); // 黒でクリア
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // WebGLレンダリング結果をエディターの背景に設定
  setEditorBackground();

  // ポップアップへの送信を制限
  const now = Date.now();
  if (popupWindow && !popupWindow.closed && (now - lastPopupUpdate) > popupUpdateInterval) {
    const dataURL = gl.canvas.toDataURL();
    popupWindow.postMessage({ type: 'renderResult', data: dataURL }, '*');
    lastPopupUpdate = now;
  }

  requestAnimationFrame(render);
}

/**
 * エディターの背景にWebGLレンダリング結果を設定
 */
function setEditorBackground() {
  const canvas = document.getElementById('render-canvas');
  const dataURL = canvas.toDataURL();
  const editorContainer = document.getElementById('editor-container');
  editorContainer.style.backgroundImage = `url(${dataURL})`;
  editorContainer.style.backgroundSize = 'cover';
  editorContainer.style.backgroundRepeat = 'no-repeat';
  editorContainer.style.backgroundPosition = 'center';
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
    if (audioInputs.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.text = 'マイクが見つかりません';
      microphoneSelect.appendChild(option);
    } else {
      audioInputs.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `マイクデバイス ${microphoneSelect.length}`;
        microphoneSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('デバイス取得エラー:', err);
  }
}

/**
 * マイクの開始
 */
async function startMicrophone(deviceId) {
  if (!deviceId) return;

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
  }

  try {
    // マイクの設定を適切に設定
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId,
        channelCount: 2, // ステレオ
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(microphoneStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    audioDataArray = new Uint8Array(bufferLength);

    createAudioTexture();
    updateMicrophoneStatus(true);
  } catch (err) {
    console.error('マイクへのアクセスが拒否されました。', err);
    updateMicrophoneStatus(false);
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
    gl.RGBA,
    audioDataArray.length / 4, // テクスチャの幅を調整
    1,
    0,
    gl.RGBA,
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

    // RGBAフォーマットに変換
    const rgbaData = new Uint8Array(audioDataArray.length * 4);
    for (let i = 0; i < audioDataArray.length; i++) {
      const value = audioDataArray[i];
      rgbaData[i * 4] = value;     // R
      rgbaData[i * 4 + 1] = value; // G
      rgbaData[i * 4 + 2] = value; // B
      rgbaData[i * 4 + 3] = 255;   // A
    }

    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      audioDataArray.length / 4, // テクスチャの幅
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      rgbaData
    );
  }
}

/**
 * 使用時間のトラッキング開始
 */
function startTrackingUsage() {
  setInterval(() => {
    if (!isTracking) return;

    const usageTime = 300; // 5分（300秒）
    const updateCount = 1; // 1回の更新

    const session = JSON.parse(localStorage.getItem('session'));
    const nickname = session ? session.nickname : 'unknown';

    const data = new URLSearchParams();
    data.append('action', 'updateUsage');
    data.append('nickname', nickname);
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
        // 累計時間をローカルストレージに保存
        let cumulative = parseInt(localStorage.getItem('cumulativeUsage') || '0');
        cumulative += usageTime;
        localStorage.setItem('cumulativeUsage', cumulative);
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
  const toggleEditorBtn = document.getElementById('toggle-editor-btn');
  const microphoneSelect = document.getElementById('microphone-select');
  const sampleSelect = document.getElementById('sample-select');
  const micToggleBtn = document.getElementById('mic-toggle-btn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveCodeToLocalStorage);
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

  if (toggleEditorBtn) {
    toggleEditorBtn.addEventListener('click', toggleEditor);
  }

  if (microphoneSelect) {
    microphoneSelect.addEventListener('change', (e) => {
      startMicrophone(e.target.value);
    });
  }

  if (sampleSelect) {
    sampleSelect.addEventListener('change', loadSampleCode);
  }

  if (micToggleBtn) {
    micToggleBtn.addEventListener('click', toggleMicrophone);
  }

  // ロードモーダルの閉じるボタン設定
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
  try {
    const response = await fetch('SampleCode/sample1.frag');
    if (!response.ok) {
      throw new Error(`サンプルコードの読み込みに失敗しました: ${response.statusText}`);
    }
    const shaderCode = await response.text();
    editor.setValue(shaderCode);
    compileShader(); // シェーダーをコンパイル
  } catch (error) {
    console.error('サンプルコード読み込みエラー:', error);
    alert('サンプルコードの読み込み中にエラーが発生しました。');
  }
}

/**
 * ブラウザキャッシュからコードをロードする関数
 */
function loadCode() {
  const savedCode = localStorage.getItem('savedCode');
  if (savedCode) {
    editor.setValue(savedCode);
    compileShader(); // シェーダーをコンパイル
  } else {
    loadSampleCode();
  }
}

/**
 * コードの保存（localStorage） - 名前付き保存
 */
function saveCodeToLocalStorage() {
  const code = editor.getValue();
  const name = prompt('保存するシェーダーの名前を入力してください:');
  
  if (name) {
    const key = `shader_${name}`;
    localStorage.setItem(key, code);
    alert(`コード「${name}」が保存されました。`);
  } else {
    alert('保存がキャンセルされました。');
  }
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
    compileShader(); // シェーダーをコンパイル
    alert(`コード「${selectedKey.replace('shader_', '')}」がロードされました。`);
    document.getElementById('load-modal').classList.add('hidden');
  } else {
    alert('選択されたコードが見つかりません。');
  }
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
  
  popupWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>ポップアップレンダリング結果</title>
      <style>
        body { margin: 0; background-color: #000; }
        img { width: 100%; height: 100vh; object-fit: contain; }
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
  
  // 初回レンダリング後に送信
  popupWindow.onload = function() {
    const dataURL = gl.canvas.toDataURL();
    popupWindow.postMessage({ type: 'renderResult', data: dataURL }, '*');
    lastPopupUpdate = Date.now();
  };
  
  resizeCanvas();
}

/**
 * 解像度の適用
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
    document.getElementById('toggle-editor-btn').innerHTML = '<i class="fas fa-code"></i>';
  } else {
    editorContainer.classList.add('hidden');
    consoleContainer.classList.add('hidden');
    document.getElementById('toggle-editor-btn').innerHTML = '<i class="fas fa-code-slash"></i>';
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
 * トラッキング状態の更新
 */
function updateTrackingStatus(status) {
  const trackingIndicator = document.getElementById('tracking-status');
  if (status) {
    trackingIndicator.innerHTML = '<i class="fas fa-eye"></i> トラッキング: ON';
    trackingIndicator.style.color = 'green';
  } else {
    trackingIndicator.innerHTML = '<i class="fas fa-eye-slash"></i> トラッキング: OFF';
    trackingIndicator.style.color = 'red';
  }
}

/**
 * マイクのオンオフ切り替え
 */
function toggleMicrophone() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    analyser = null;
    audioDataArray = null;
    audioTexture = null;
    updateMicrophoneStatus(false);
  } else {
    const deviceId = document.getElementById('microphone-select').value;
    if (!deviceId) {
      alert('マイクを選択してください。');
      return;
    }
    startMicrophone(deviceId);
    updateMicrophoneStatus(true);
  }
}

/**
 * マイク状態の更新
 */
function updateMicrophoneStatus(status) {
  const micIndicator = document.getElementById('mic-status');
  const micToggleBtn = document.getElementById('mic-toggle-btn');
  if (status) {
    micIndicator.innerHTML = '<i class="fas fa-microphone"></i> マイク: ON';
    micIndicator.style.color = 'green';
    micToggleBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    micToggleBtn.style.backgroundColor = '#28a745';
    micToggleBtn.style.borderRadius = '4px';
    micToggleBtn.style.padding = '5px';
  } else {
    micIndicator.innerHTML = '<i class="fas fa-microphone-slash"></i> マイク: OFF';
    micIndicator.style.color = 'red';
    micToggleBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    micToggleBtn.style.backgroundColor = '#dc3545';
    micToggleBtn.style.borderRadius = '4px';
    micToggleBtn.style.padding = '5px';
  }
}

/**
 * 認証コンテナの表示
 */
function showMainContainer() {
  const toolbar = document.getElementById('toolbar');
  const mainContainer = document.getElementById('main-container');
  if (toolbar && mainContainer) {
    toolbar.classList.remove('hidden');
    mainContainer.classList.remove('hidden');
  }
}

/**
 * キャンバスの解像度を設定する関数
 */
function setCanvasResolution() {
  const widthInput = document.getElementById('canvas-width').value;
  const heightInput = document.getElementById('canvas-height').value;
  
  const width = parseInt(widthInput);
  const height = parseInt(heightInput);
  
  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    alert('有効な解像度を入力してください。');
    return;
  }
  
  canvasWidth = width;
  canvasHeight = height;
  resizeCanvas();
  compileShader(); // 再コンパイル
}
