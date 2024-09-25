// shader.js

import { editor } from './editor.js';
import { uniforms, setUniforms, generateUniformUI, uniformDefinitions, existingUniforms } from './uniforms.js';
import { getAudioDataArray } from './audio.js';
import { resetUniformDefinitions, resetExistingUniforms } from './uniforms.js';

let gl;
let shaderProgram;
let positionBuffer;
export let iTime = 0;
export let startTime = Date.now();

let debugNames = [];
let debugValues = [];

export let audioTexture;

export function initWebGL() {
    const canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        alert('WebGLがサポートされていません。');
        return;
    }

    resizeCanvas();

    const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
    ]);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    compileShader();
}

export function resizeCanvas() {
    const canvas = document.getElementById('glcanvas');
    const controlPanelWidth = document.getElementById('control-panel').offsetWidth;
    canvas.width = window.innerWidth - controlPanelWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

export function compileShader() {
    let fragmentSource = editor.getValue();

    if (!fragmentSource) {
        fragmentSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(1.0);
            }
        `;
    }

    fragmentSource = preprocessShaderCode(fragmentSource);

    const vertexShader = createShader(gl.VERTEX_SHADER, defaultVertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
        return;
    }

    if (shaderProgram) {
        gl.deleteProgram(shaderProgram);
    }

    shaderProgram = createProgram(vertexShader, fragmentShader);
    if (!shaderProgram) {
        return;
    }

    gl.useProgram(shaderProgram);

    setUniforms(gl, shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    render();
}

const defaultVertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

function preprocessShaderCode(shaderCode) {
    parseUniforms(shaderCode);

    const printRegex = /print\(\s*"([^"]+)"\s*,\s*([^)]+)\s*\);/g;
    let match;
    let debugCount = 0;
    debugNames = [];
    debugValues = [];

    shaderCode = shaderCode.replace(printRegex, function(match, p1, p2) {
        debugCount++;
        const debugVar = `debugVar${debugCount}`;
        debugNames.push(p1);
        debugValues.push(0);
        return `${debugVar} = ${p2};`;
    });

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

        ${getUserUniforms()}

        ${debugVariables}

        ${shaderCode}
    `;
}

function parseUniforms(shaderCode) {
    const uniformRegex = /uniform\s+(float|vec[2-4]|int|bool)\s+(\w+)\s*;\s*(\/\/\s*option:\s*(\w+))?/g;
    resetUniformDefinitions();
    resetExistingUniforms();

    let match;
    while ((match = uniformRegex.exec(shaderCode)) !== null) {
        const type = match[1];
        const name = match[2];
        const option = match[4] || 'default';
        existingUniforms[name] = true;
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
    generateUniformUI();
}

function getUserUniforms() {
    let uniformsCode = '';
    for (let name in uniformDefinitions) {
        const type = uniformDefinitions[name].type;
        if (!existingUniforms[name]) {
            uniformsCode += `uniform ${type} ${name};\n`;
        }
    }
    return uniformsCode;
}

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

function render() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    iTime = (Date.now() - startTime) / 1000.0;
    const timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
    if (timeLocation !== null) {
        gl.uniform1f(timeLocation, iTime);
    }

    setUniforms(gl, shaderProgram);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    updateDebugInfo();

    requestAnimationFrame(render);
}

function updateDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    let debugText = '';
    for (let i = 0; i < debugNames.length; i++) {
        debugText += `${debugNames[i]}: ${debugValues[i].toFixed(2)}\n`;
    }
    debugInfo.textContent = debugText;
}

function displayShaderError(error) {
    const errorLog = document.getElementById('error-log');
    errorLog.textContent = error;

    const regex = /ERROR: \d+:(\d+): (.*)/g;
    let match;
    let annotations = [];

    while ((match = regex.exec(error)) !== null) {
        const lineNumber = parseInt(match[1], 10) - 1;
        const message = match[2];
        annotations.push({
            from: CodeMirror.Pos(lineNumber, 0),
            to: CodeMirror.Pos(lineNumber, 0),
            message: message,
            severity: 'error'
        });
    }

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

export function updateShader() {
    setUniforms(gl, shaderProgram);
}

export function getGLContext() {
    return gl;
}

window.updateShader = updateShader;