// shader.js

// シェーダーのコンパイル、プリプロセス、レンダリング

import { editor } from './editor.js';
import { uniforms, setUniforms, generateUniformUI, uniformDefinitions, existingUniforms } from './uniforms.js';
import { getAudioDataArray } from './audio.js';

let gl;
let shaderProgram;
let positionBuffer;
let iTime = 0;
let startTime = Date.now();
let debugNames = []; // デバッグ名のリスト
let debugValues = []; // デバッグ値のリスト

// エラーハンドル用
let errorAnnotations = [];

// audio.jsからエクスポートされるオーディオテクスチャ
export let audioTexture;

export function initWebGL() {
    const canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        alert('WebGLがサポートされていません。');
        return;
    }

    // キャンバスのサイズを設定
    resizeCanvas();

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

export function resizeCanvas() {
    const canvas = document.getElementById('glcanvas');
    canvas.width = window.innerWidth - 300; // コントロールパネルの幅を引く
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

export function compileShader() {
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
    setUniforms(gl, shaderProgram);

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
    // ユニフォーム変数の解析
    parseUniforms(shaderCode);

    // デバッグ用の関数を挿入
    const printRegex = /print\(\s*"([^"]+)"\s*,\s*([^)]+)\s*\);/g;
    let match;
    let debugCount = 0;
    debugNames = []; // リセット
    debugValues = []; // リセット

    // print関数をdebugVarNに置き換える
    shaderCode = shaderCode.replace(printRegex, function(match, p1, p2) {
        debugCount++;
        const debugVar = `debugVar${debugCount}`;
        debugNames.push(p1);
        debugValues.push(0); // 初期値
        return `${debugVar} = ${p2};`;
    });

    // debugVarNをグローバル変数として宣言
    let debugVariables = '';
    for (let i = 1; i <= debugCount; i++) {
        debugVariables += `float debugVar${i} = 0.0;\n`;
    }

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
        ${debugVariables}

        ${shaderCode}
    `;
}

// ユニフォーム変数の解析
function parseUniforms(shaderCode) {
    const uniformRegex = /uniform\s+(float|vec[2-4]|int|bool)\s+(\w+)\s*;\s*(\/\/\s*option:\s*(\w+))?/g;
    uniformDefinitions = {}; // リセット
    existingUniforms = {}; // ユーザーが宣言したユニフォーム変数
    let match;
    while ((match = uniformRegex.exec(shaderCode)) !== null) {
        const type = match[1];
        const name = match[2];
        const option = match[4] || 'default';
        existingUniforms[name] = true; // ユーザーが宣言したユニフォームとして記録
        let defaultValue;
        switch (type) {
            case 'float':
                defaultValue = 0.0;
                break;
            case 'vec2':
                defaultValue = [0.0, 0.0];
                break;
            case 'vec3':
                defaultValue = [0.0, 0.0, 0.0];
                break;
            case 'vec4':
                defaultValue = [0.0, 0.0, 0.0, 0.0];
                break;
            case 'int':
                defaultValue = 0;
                break;
            case 'bool':
                defaultValue = false;
                break;
            default:
                defaultValue = null;
        }
        uniformDefinitions[name] = { type, value: defaultValue, option };
    }
    generateUniformUI(); // ユニフォームUIの生成
}

// ユーザー定義のユニフォーム変数を生成
function getUserUniforms() {
    let uniformsCode = '';
    for (let name in uniformDefinitions) {
        const type = uniformDefinitions[name].type;
        // 既にユーザーが宣言している場合は再宣言しない
        if (!existingUniforms[name]) {
            uniformsCode += `uniform ${type} ${name};\n`;
        }
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
    displayShaderError(error);
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
    displayShaderError(error);
    gl.deleteProgram(program);
    return null;
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

    // オーディオデータの更新
    const audioDataArray = getAudioDataArray();
    if (audioDataArray) {
        // オーディオテクスチャにデータを転送
        gl.bindTexture(gl.TEXTURE_2D, audioTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, audioDataArray.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, audioDataArray);
    }

    // シェーダーの描画
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // デバッグ情報の取得
    updateDebugInfo();

    requestAnimationFrame(render);
}

// デバッグ情報の更新
function updateDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    let debugText = '';
    for (let i = 0; i < debugNames.length; i++) {
        debugText += `${debugNames[i]}: ${debugValues[i].toFixed(2)}\n`;
    }
    debugInfo.textContent = debugText;
}

// シェーダーエラーの表示とエディターへのマッピング
function displayShaderError(error) {
    const errorLog = document.getElementById('error-log');
    errorLog.textContent = error;

    // エラーメッセージを解析し、CodeMirror エディターにマッピング
    const regex = /ERROR: \d+:(\d+): (.*)/g;
    let match;
    let annotations = [];

    while ((match = regex.exec(error)) !== null) {
        const lineNumber = parseInt(match[1], 10) - 1; // CodeMirror は0ベース
        const message = match[2];
        annotations.push({
            from: CodeMirror.Pos(lineNumber, 0),
            to: CodeMirror.Pos(lineNumber, 0),
            message: message,
            severity: 'error'
        });
    }

    // エディターにエラーを表示
    editor.getDoc().clearGutter('error-gutter');
    editor.getAllMarks().forEach(mark => mark.clear());

    annotations.forEach(annotation => {
        editor.addLineClass(annotation.from.line, 'background', 'error-line');
        const marker = document.createElement('div');
        marker.className = 'error-marker';
        marker.title = annotation.message;
        editor.setGutterMarker(annotation.from.line, 'error-gutter', marker);
    });
}

// updateShader関数を追加しエクスポート
export function updateShader() {
    // ユニフォームの値を更新して再描画
    setUniforms(gl, shaderProgram);
}

// GLコンテキストを取得する関数をエクスポート
export function getGLContext() {
    return gl;
}
