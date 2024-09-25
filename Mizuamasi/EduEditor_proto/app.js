import { initWebGL, resizeCanvas, renderFrame, vertexShaderSource, print_impl } from './webgl.js';
import { initEditor, getEditorCode, setEditorCode } from './editor.js';
import { initUniformControls, updateUniformControls } from './uniformControls.js';

let canvas, gl, shaderProgram, editor, isEditorVisible = true;
let isMicOn = false, isWaveformVisible = false;
let audioContext, analyser, dataArray;
let popupWindow = null;
let printStatements = [];
let originalShaderCode = '';
let mouseX = 0, mouseY = 0;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    canvas = document.getElementById('glcanvas');
    gl = canvas.getContext('webgl2');

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    editor = initEditor();
    const result = await initWebGL(gl, getEditorCode());
    if (result.error) {
        displayError(result.error);
    } else {
        shaderProgram = result.program;
        printStatements = result.printStatements;
        originalShaderCode = result.originalSource;
        initUniformControls(gl, shaderProgram);
    }

    setupEventListeners();
    resizeCanvas(gl);
    window.addEventListener('resize', () => resizeCanvas(gl));

    requestAnimationFrame(animate);
}

function setupEventListeners() {
    document.getElementById('toggleEditor').addEventListener('click', toggleEditor);
    document.getElementById('saveCode').addEventListener('click', saveCode);
    document.getElementById('loadCode').addEventListener('click', loadCode);
    document.getElementById('toggleMic').addEventListener('click', toggleMic);
    document.getElementById('toggleWaveform').addEventListener('click', toggleWaveform);
    document.getElementById('openPopup').addEventListener('click', openPopup);
}

function toggleEditor() {
    isEditorVisible = !isEditorVisible;
    document.getElementById('editor-container').style.display = isEditorVisible ? 'block' : 'none';
    document.getElementById('render-container').style.width = isEditorVisible ? '50%' : '100%';
    resizeCanvas(gl);
}

function saveCode() {
    const code = getEditorCode();
    localStorage.setItem('shaderCode', code);
    alert('シェーダーコードを保存しました');
}

function loadCode() {
    const code = localStorage.getItem('shaderCode');
    if (code) {
        setEditorCode(code);
        alert('シェーダーコードを読み込みました');
    } else {
        alert('保存されたコードがありません');
    }
}

async function toggleMic() {
    if (!isMicOn) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 2048;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            isMicOn = true;
        } catch (err) {
            console.error('マイクの使用許可がありません:', err);
            alert('マイクの使用許可がありません');
        }
    } else {
        if (audioContext) {
            audioContext.close();
        }
        isMicOn = false;
    }
}

function toggleWaveform() {
    isWaveformVisible = !isWaveformVisible;
}

function openPopup() {
    if (popupWindow && !popupWindow.closed) {
        popupWindow.focus();
    } else {
        popupWindow = window.open('', 'Preview', 'width=800,height=600');
        const popupContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview</title>
                <style>
                    body, html { margin: 0; padding: 0; overflow: hidden; }
                    canvas { width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                <canvas id="popupCanvas"></canvas>
                <script>
                    const canvas = document.getElementById('popupCanvas');
                    const gl = canvas.getContext('webgl2');
                    let shaderProgram;
                    
                    function resizeCanvas() {
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        gl.viewport(0, 0, canvas.width, canvas.height);
                    }
                    
                    window.addEventListener('resize', resizeCanvas);
                    resizeCanvas();

                    window.addEventListener('message', (event) => {
                        if (event.data.type === 'render') {
                            if (!shaderProgram) {
                                const vertexShader = compileShader(gl.VERTEX_SHADER, event.data.vertexShaderSource);
                                const fragmentShader = compileShader(gl.FRAGMENT_SHADER, event.data.fragmentShaderSource);
                                shaderProgram = createProgram(vertexShader, fragmentShader);
                            }
                            renderFrame(event.data.time);
                        }
                    });

                    function compileShader(type, source) {
                        const shader = gl.createShader(type);
                        gl.shaderSource(shader, source);
                        gl.compileShader(shader);
                        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                            console.error('シェーダーのコンパイルに失敗しました: ' + gl.getShaderInfoLog(shader));
                            gl.deleteShader(shader);
                            return null;
                        }
                        return shader;
                    }

                    function createProgram(vertexShader, fragmentShader) {
                        const program = gl.createProgram();
                        gl.attachShader(program, vertexShader);
                        gl.attachShader(program, fragmentShader);
                        gl.linkProgram(program);
                        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                            console.error('シェーダープログラムのリンクに失敗しました: ' + gl.getProgramInfoLog(program));
                            return null;
                        }
                        return program;
                    }

                    function renderFrame(time) {
                        gl.useProgram(shaderProgram);
                        const iTimeLocation = gl.getUniformLocation(shaderProgram, "iTime");
                        gl.uniform1f(iTimeLocation, time * 0.001);
                        const iResolutionLocation = gl.getUniformLocation(shaderProgram, "iResolution");
                        gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);
                        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    }
                </script>
            </body>
            </html>
        `;
        popupWindow.document.write(popupContent);
    }
}

let lastShaderCode = '';

function animate(time) {
    const shaderCode = getEditorCode();
    if (shaderCode !== lastShaderCode) {
        const result = initWebGL(gl, shaderCode);
        if (result.error) {
            console.error(result.error);
            displayError(result.error);
            requestAnimationFrame(animate);
            return;
        } else {
            if (shaderProgram) {
                gl.deleteProgram(shaderProgram);
            }
            shaderProgram = result.program;
            printStatements = result.printStatements;
            originalShaderCode = result.originalSource;
            initUniformControls(gl, shaderProgram);
            lastShaderCode = shaderCode;
            clearError();
        }
    }

    updateUniformControls(gl, shaderProgram);

    if (isMicOn && analyser) {
        analyser.getByteFrequencyData(dataArray);
        // ここでdataArrayをテクスチャとしてGPUに送る処理を追加
    }

    renderFrame(gl, shaderProgram, time);

    // デバッグ情報の処理
    processPrintStatements(originalShaderCode, printStatements);

    if (popupWindow && !popupWindow.closed) {
        popupWindow.postMessage({
            type: 'render',
            time: time,
            vertexShaderSource: vertexShaderSource,
            fragmentShaderSource: shaderCode
        }, '*');
    }

    requestAnimationFrame(animate);
}

function processPrintStatements(sourceCode, statements) {
    const debugOutput = document.getElementById('debug-output');
    debugOutput.innerHTML = ''; // Clear previous output

    statements.forEach(stmt => {
        const variableDeclaration = findVariableDeclaration(sourceCode, stmt.name, stmt.offset);
        if (variableDeclaration) {
            const type = getVariableType(variableDeclaration);
            const value = getValueFromShader(gl, shaderProgram, stmt.name, type);
            window.print(stmt.name, value);
        }
    });
}

function getValueFromShader(gl, program, variableName, type) {
    const location = gl.getUniformLocation(program, variableName);
    if (location === null) return 'Not found';

    const x = mouseX / canvas.width;
    const y = mouseY / canvas.height;

    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, 'iMouse'), mouseX, mouseY);
    
    // Render a single pixel
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.viewport(0, 0, 1, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const pixels = new Float32Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixels);

    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    switch(type) {
        case 'float': return pixels[0];
        case 'vec2': return [pixels[0], pixels[1]];
        case 'vec3': return [pixels[0], pixels[1], pixels[2]];
        case 'vec4': return [pixels[0], pixels[1], pixels[2], pixels[3]];
        default: return 'Unknown type';
    }
}

function findVariableDeclaration(sourceCode, variableName, startOffset) {
    const regex = new RegExp(`\\b(float|vec2|vec3|vec4)\\s+${variableName}\\b`, 'g');
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(sourceCode)) !== null) {
        if (match.index < startOffset) {
            return match[0];
        }
    }
    return null;
}

function getVariableType(declaration) {
    if (declaration.startsWith('float')) return 'float';
    if (declaration.startsWith('vec2')) return 'vec2';
    if (declaration.startsWith('vec3')) return 'vec3';
    if (declaration.startsWith('vec4')) return 'vec4';
    return 'unknown';
}

function displayError(errorMsg) {
    const errorOutput = document.getElementById('error-output');
    errorOutput.textContent = errorMsg;
    errorOutput.style.display = 'block';
}

function clearError() {
    const errorOutput = document.getElementById('error-output');
    errorOutput.textContent = '';
    errorOutput.style.display = 'none';
}

window.print = function(label, value) {
    const debugOutput = document.getElementById('debug-output');
    let valueString;
    if (Array.isArray(value)) {
        valueString = `(${value.map(v => v.toFixed(6)).join(', ')})`;
    } else if (typeof value === 'number') {
        valueString = value.toFixed(6);
    } else {
        valueString = value.toString();
    }
    debugOutput.innerHTML += `<div>${label}: ${valueString}</div>`;
    // 最新の10行だけを表示
    const lines = debugOutput.innerHTML.split('<div>');
    if (lines.length > 10) {
        debugOutput.innerHTML = lines.slice(-10).join('<div>');
    }
    debugOutput.scrollTop = debugOutput.scrollHeight;
};