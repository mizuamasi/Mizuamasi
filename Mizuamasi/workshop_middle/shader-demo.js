const canvas = document.getElementById('shaderCanvas');
const gl = canvas.getContext('webgl');
let currentMode = 'uv';
let currentStep = 0;
let isPlaying = false;
let animationId;
let animationSpeed = 1;

// この部分は、let animationSpeed = 1; の後に追加してください。

const vertexShaderSource = `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform int u_mode;
    uniform float u_param;
    uniform float u_step;

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 color;
        
        if (u_mode == 0) { // UV座標表示
            color = vec4(uv, 0.0, 1.0);
        } else if (u_mode == 1) { // グラデーション
            color = vec4(uv.x, uv.y, 0.5, 1.0);
        } else if (u_mode == 2) { // 同心円
            float dist = distance(uv, vec2(0.5));
            color = vec4(vec3(fract(dist * u_param)), 1.0);
        } else if (u_mode == 3) { // ストライプ
            color = vec4(vec3(step(0.5, fract(uv.x * u_param))), 1.0);
        } else if (u_mode == 4) { // チェッカーボード
            vec2 checkPos = floor(uv * u_param);
            color = vec4(vec3(mod(checkPos.x + checkPos.y, 2.0)), 1.0);
        }
        
        gl_FragColor = mix(vec4(uv, 0.0, 1.0), color, u_step);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [
    -1, -1,
    1, -1,
    -1,  1,
    1,  1,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
const modeUniformLocation = gl.getUniformLocation(program, "u_mode");
const paramUniformLocation = gl.getUniformLocation(program, "u_param");
const stepUniformLocation = gl.getUniformLocation(program, "u_step");

function draw() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1i(modeUniformLocation, ['uv', 'gradient', 'circles', 'stripes', 'checkerboard'].indexOf(currentMode));
    gl.uniform1f(paramUniformLocation, params[currentMode]?.frequency || 1);
    gl.uniform1f(stepUniformLocation, currentStep);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

const params = {
    circles: { frequency: 10 },
    stripes: { frequency: 10 },
    checkerboard: { frequency: 10 }
};

// WebGLの初期化コードは省略（前回のコードを使用）

function setMode(mode) {
    currentMode = mode;
    currentStep = 0;
    updateParamControls();
    draw();
    updateExplanation();
}

function updateParamControls() {
    const slider = document.getElementById('frequencySlider');
    const valueDisplay = document.getElementById('frequencyValue');
    if (['circles', 'stripes', 'checkerboard'].includes(currentMode)) {
        slider.value = params[currentMode].frequency;
        valueDisplay.textContent = params[currentMode].frequency;
        slider.oninput = (e) => {
            params[currentMode].frequency = parseFloat(e.target.value);
            valueDisplay.textContent = e.target.value;
            draw();
            updateExplanation();
        };
    }
}


function updateExplanation() {
    const calculation = document.getElementById('calculation');
    const stepExplanation = document.getElementById('stepExplanation');
    const uv = getMouseUV(event);

    let calcText = '';
    let explainText = '';

    switch (currentMode) {
        case 'uv':
            calcText = `UV座標: (${uv.x.toFixed(2)}, ${uv.y.toFixed(2)})
色: rgb(${Math.floor(uv.x * 255)}, ${Math.floor(uv.y * 255)}, 0)`;
            explainText = 'UV座標を直接色として使用しています。x座標が赤、y座標が緑の強さを決定します。';
            break;
        case 'gradient':
            calcText = `UV座標: (${uv.x.toFixed(2)}, ${uv.y.toFixed(2)})
色: rgb(${Math.floor(uv.x * 255)}, ${Math.floor(uv.y * 255)}, 128)`;
            explainText = 'UV座標を基に滑らかな色の変化を作成しています。x座標が赤、y座標が緑、青は固定値です。';
            break;
        case 'circles':
            const dist = Math.sqrt(Math.pow(uv.x - 0.5, 2) + Math.pow(uv.y - 0.5, 2));
            const freq = params.circles.frequency;
            const circleValue = (dist * freq) % 1;
            calcText = `UV座標: (${uv.x.toFixed(2)}, ${uv.y.toFixed(2)})
中心からの距離: ${dist.toFixed(4)}
距離 * 周波数: ${(dist * freq).toFixed(4)}
最終値: ${circleValue.toFixed(4)}
色: rgb(${Math.floor(circleValue * 255)}, ${Math.floor(circleValue * 255)}, ${Math.floor(circleValue * 255)})`;
            explainText = '中心からの距離を計算し、その値に周波数を掛けた後の小数部分を取り出して同心円を描画しています。';
            break;
        case 'stripes':
            const stripeValue = Math.floor(uv.x * params.stripes.frequency) % 2;
            calcText = `UV座標: (${uv.x.toFixed(2)}, ${uv.y.toFixed(2)})
x * 周波数: ${(uv.x * params.stripes.frequency).toFixed(4)}
ストライプ値: ${stripeValue}
色: rgb(${stripeValue * 255}, ${stripeValue * 255}, ${stripeValue * 255})`;
            explainText = 'x座標に周波数を掛け、その整数部分の偶奇でストライプを生成しています。';
            break;
        case 'checkerboard':
            const checkX = Math.floor(uv.x * params.checkerboard.frequency);
            const checkY = Math.floor(uv.y * params.checkerboard.frequency);
            const checkValue = (checkX + checkY) % 2;
            calcText = `UV座標: (${uv.x.toFixed(2)}, ${uv.y.toFixed(2)})
x * 周波数: ${(uv.x * params.checkerboard.frequency).toFixed(4)}
y * 周波数: ${(uv.y * params.checkerboard.frequency).toFixed(4)}
チェック値: ${checkValue}
色: rgb(${checkValue * 255}, ${checkValue * 255}, ${checkValue * 255})`;
            explainText = 'x座標とy座標それぞれに周波数を掛けた整数部分の和の偶奇でチェッカーボードを生成しています。';
            break;
    }

    calculation.textContent = calcText;
    stepExplanation.textContent = explainText;
}

function getMouseUV(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width;
    const y = 1 - (event.clientY - rect.top) / canvas.height;
    return { x, y };
}

canvas.addEventListener('mousemove', (event) => {
    const uv = getMouseUV(event);
    document.getElementById('coordDisplay').textContent = `UV: (${uv.x.toFixed(2)}, ${uv.y.toFixed(2)})`;
    updateExplanation();
});

document.getElementById('prevStep').addEventListener('click', () => {
    currentStep = Math.max(0, currentStep - 0.1);
    draw();
    updateExplanation();
});

document.getElementById('nextStep').addEventListener('click', () => {
    currentStep = Math.min(1, currentStep + 0.1);
    draw();
    updateExplanation();
});

document.getElementById('playPause').addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        animate();
    } else {
        cancelAnimationFrame(animationId);
    }
});

document.getElementById('speedSlider').addEventListener('input', (e) => {
    animationSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = `${animationSpeed.toFixed(1)}x`;
});

function animate() {
    currentStep += 0.01 * animationSpeed;
    if (currentStep > 1) currentStep = 0;
    draw();
    updateExplanation();
    if (isPlaying) {
        animationId = requestAnimationFrame(animate);
    }
}

// 初期化
updateParamControls();
draw();
updateExplanation();