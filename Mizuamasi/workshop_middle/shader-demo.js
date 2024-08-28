const canvas = document.getElementById('shaderCanvas');
const gl = canvas.getContext('webgl');
let currentMode = 'uv';
let params = {
    circles: { frequency: 10 },
    stripes: { frequency: 10 },
    checkerboard: { frequency: 10 }
};

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

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        
        if (u_mode == 0) {
            // UV座標表示
            gl_FragColor = vec4(uv, 0.0, 1.0);
        } else if (u_mode == 1) {
            // グラデーション
            gl_FragColor = vec4(uv.x, uv.y, 0.5, 1.0);
        } else if (u_mode == 2) {
            // 同心円
            float dist = distance(uv, vec2(0.5));
            gl_FragColor = vec4(vec3(fract(dist * u_param)), 1.0);
        } else if (u_mode == 3) {
            // ストライプ
            float stripe = mod(uv.x * u_param, 1.0) < 0.5 ? 0.0 : 1.0;
            gl_FragColor = vec4(vec3(stripe), 1.0);
        } else if (u_mode == 4) {
            // チェッカーボード
            float check = mod(floor(uv.x * u_param) + floor(uv.y * u_param), 2.0);
            gl_FragColor = vec4(vec3(check), 1.0);
        }
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

function setMode(mode) {
    currentMode = mode;
    updateParamControls();
    draw();
    updateExplanation();
}

function updateParamControls() {
    const controlsContainer = document.getElementById('paramControls');
    controlsContainer.innerHTML = '';
    if (['circles', 'stripes', 'checkerboard'].includes(currentMode)) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1';
        slider.max = '50';
        slider.value = params[currentMode].frequency;
        slider.oninput = (e) => {
            params[currentMode].frequency = parseFloat(e.target.value);
            draw();
        };
        controlsContainer.appendChild(slider);
    }
}

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

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function updateExplanation() {
    const explanations = {
        uv: {
            diagram: `
                <svg viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="uvGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:rgb(255,0,0)" />
                            <stop offset="100%" style="stop-color:rgb(0,255,0)" />
                        </linearGradient>
                    </defs>
                    <rect width="100" height="100" fill="url(#uvGradient)" />
                    <text x="5" y="95" fill="white">0,0</text>
                    <text x="75" y="15" fill="white">1,1</text>
                </svg>
            `,
            text: `
                <h3>UV座標表示</h3>
                <p>1. フラグメントシェーダーは画面上の各ピクセルに対して実行されます。</p>
                <p>2. 各ピクセルの位置は、UV座標系で表されます：</p>
                <ul>
                    <li>U: 横方向の位置（0.0が左端、1.0が右端）</li>
                    <li>V: 縦方向の位置（0.0が下端、1.0が上端）</li>
                </ul>
                <p>3. この例では、UV座標を直接色として使用しています：</p>
                <ul>
                    <li>赤成分 = U値（横位置）</li>
                    <li>緑成分 = V値（縦位置）</li>
                    <li>青成分 = 0.0（固定）</li>
                </ul>
                <p>4. 結果として、左下が赤（1,0,0）、右上が黄緑（1,1,0）のグラデーションが生成されます。</p>
            `
        },
        gradient: {
            diagram: `
                <svg viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="xyGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:rgb(0,0,128)" />
                            <stop offset="100%" style="stop-color:rgb(255,255,128)" />
                        </linearGradient>
                    </defs>
                    <rect width="100" height="100" fill="url(#xyGradient)" />
                    <text x="5" y="95" fill="white">青</text>
                    <text x="75" y="15" fill="black">黄</text>
                </svg>
            `,
            text: `
                <h3>グラデーション</h3>
                <p>1. 各ピクセルのUV座標を基に、滑らかな色の変化を作成します。</p>
                <p>2. 色の計算方法：</p>
                <ul>
                    <li>赤成分 = U値（横位置）</li>
                    <li>緑成分 = V値（縦位置）</li>
                    <li>青成分 = 0.5（固定）</li>
                </ul>
                <p>3. この結果、以下のような色の分布になります：</p>
                <ul>
                    <li>左下: 暗い青 (0.0, 0.0, 0.5)</li>
                    <li>右下: 紫 (1.0, 0.0, 0.5)</li>
                    <li>左上: 緑がかった青 (0.0, 1.0, 0.5)</li>
                    <li>右上: 黄 (1.0, 1.0, 0.5)</li>
                </ul>
                <p>4. UV座標を色に直接マッピングすることで、滑らかなグラデーションが生成されます。</p>
            `
        },
        circles: {
            diagram: `
                <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="black" stroke-width="2"/>
                    <circle cx="50" cy="50" r="30" fill="none" stroke="black" stroke-width="2"/>
                    <circle cx="50" cy="50" r="15" fill="none" stroke="black" stroke-width="2"/>
                    <line x1="50" y1="50" x2="95" y2="50" stroke="red" stroke-width="2"/>
                    <text x="70" y="45" fill="red">r</text>
                </svg>
            `,
            text: `
                <h3>同心円</h3>
                <p>1. 各ピクセルの中心からの距離を計算し、同心円を描画します。</p>
                <p>2. 処理手順：</p>
                <ol>
                    <li>UV座標を (0,0)〜(1,1) から (-0.5,-0.5)〜(0.5,0.5) に変換</li>
                    <li>原点 (0,0) からの距離 r を計算: r = sqrt(u^2 + v^2)</li>
                    <li>距離 r にパラメータ（周波数）を掛け、小数部分を取り出す</li>
                    <li>結果を白黒の値としてピクセルの色に設定</li>
                </ol>
                <p>3. 数式: color = fract(distance(uv - 0.5, vec2(0.0)) * frequency)</p>
                <p>4. 周波数を大きくすると、より多くの同心円が描画されます。</p>
                <p>5. この方法で、中心から放射状に広がる同心円パターンが生成されます。</p>
            `
        },
        stripes: {
            diagram: `
                <svg viewBox="0 0 100 100">
                    <rect x="0" y="0" width="25" height="100" fill="black"/>
                    <rect x="50" y="0" width="25" height="100" fill="black"/>
                    <text x="10" y="50" fill="white">0</text>
                    <text x="35" y="50" fill="black">1</text>
                    <text x="60" y="50" fill="white">0</text>
                    <text x="85" y="50" fill="black">1</text>
                </svg>
            `,
            text: `
                <h3>ストライプ</h3>
                <p>1. U座標（横位置）を使用して縦縞模様を生成します。</p>
                <p>2. 処理手順：</p>
                <ol>
                    <li>U座標に周波数パラメータを掛ける: u * frequency</li>
                    <li>結果の小数部分を取り出す: fract(u * frequency)</li>
                    <li>0.5を閾値として、結果が0.5未満なら黒、0.5以上なら白に設定</li>
                </ol>
                <p>3. 数式: color = (fract(u * frequency) < 0.5) ? 0.0 : 1.0</p>
                <p>4. 周波数を大きくすると、より多くの縦縞が描画されます。</p>
                <p>5. この方法で、画面全体に均等な幅の縦縞パターンが生成されます。</p>
            `
        },
        checkerboard: {
            diagram: `
                <svg viewBox="0 0 100 100">
                    <rect x="0" y="0" width="50" height="50" fill="black"/>
                    <rect x="50" y="50" width="50" height="50" fill="black"/>
                    <text x="20" y="30" fill="white">0,0</text>
                    <text x="70" y="30" fill="black">1,0</text>
                    <text x="20" y="80" fill="black">0,1</text>
                    <text x="70" y="80" fill="white">1,1</text>
                </svg>
            `,
            text: `
                <h3>チェッカーボード</h3>
                <p>1. UとV座標を組み合わせて市松模様（チェッカーボード）を作成します。</p>
                <p>2. 処理手順：</p>
                <ol>
                    <li>U座標とV座標それぞれに周波数パラメータを掛ける</li>
                    <li>それぞれの結果を整数部分だけ取り出す: floor(u * frequency), floor(v * frequency)</li>
                    <li>2つの値の和の偶奇で色を決定</li>
                </ol>
                <p>3. 数式: color = mod(floor(u * frequency) + floor(v * frequency), 2.0)</p>
                <p>4. 周波数を大きくすると、より小さな市松模様が描画されます。</p>
                <p>5. この方法で、画面全体に均等な大きさの市松模様が生成されます。</p>
            `
        }
    };
    document.getElementById('diagram').innerHTML = explanations[currentMode].diagram;
    document.getElementById('explanation').innerHTML = explanations[currentMode].text;
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientWidth; // 正方形に保つ
    draw();
}

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width;
    const y = 1 - (event.clientY - rect.top) / canvas.height; // Y座標を反転
    document.getElementById('coordDisplay').textContent = `UV: (${x.toFixed(2)}, ${y.toFixed(2)})`;
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
setMode('uv'); // 初期モードを設定