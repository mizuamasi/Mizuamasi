const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');
const editor = document.getElementById('editor');
const errorDiv = document.getElementById('error');
const outputDiv = document.getElementById('output');

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = canvas.height - (e.clientY - rect.top);
});

function compileShader() {
    const vertexShaderSource = `#version 300 es
        in vec4 position;
        void main() {
            gl_Position = position;
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform vec2 iResolution;
        uniform vec2 iMouse;

        out vec4 fragColor;

        const int MAX_PRINTS = 100;
        int printIndex = 0;
        vec4 printedValues[MAX_PRINTS];

        void print(float value) {
            if (printIndex < MAX_PRINTS) {
                printedValues[printIndex] = vec4(value, 0.0, 0.0, 1.0);
                printIndex++;
            }
        }

        void print(vec2 value) {
            if (printIndex < MAX_PRINTS) {
                printedValues[printIndex] = vec4(value.xy, 0.0, 2.0);
                printIndex++;
            }
        }

        void print(vec3 value) {
            if (printIndex < MAX_PRINTS) {
                printedValues[printIndex] = vec4(value.xyz, 3.0);
                printIndex++;
            }
        }

        void print(vec4 value) {
            if (printIndex < MAX_PRINTS) {
                printedValues[printIndex] = vec4(value.xyz, 4.0);
                printIndex++;
            }
        }

        void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            // ユーザーのコードをここに挿入
            ${editor.value}

            fragColor = vec4(0.0);
            for (int i = 0; i < printIndex; i++) {
                if (int(fragCoord.x) == int(iMouse.x) + i && int(fragCoord.y) == int(iMouse.y)) {
                    fragColor = printedValues[i];
                }
            }
        }

        void main() {
            mainImage(fragColor, gl_FragCoord.xy);
        }
    `;

    // シェーダーのコンパイルとエラー処理
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        errorDiv.textContent = gl.getShaderInfoLog(vertexShader);
        return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        errorDiv.textContent = gl.getShaderInfoLog(fragmentShader);
        return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        errorDiv.textContent = gl.getProgramInfoLog(program);
        return;
    }

    gl.useProgram(program);

    // エラーがなければエラーメッセージをクリア
    errorDiv.textContent = '';

    // 属性とユニフォームの設定
    const positionLocation = gl.getAttribLocation(program, 'position');
    const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
    const mouseLocation = gl.getUniformLocation(program, 'iMouse');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1,
        ]),
        gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // フレームバッファの設定
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        canvas.width,
        canvas.height,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
    );

    function render() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(mouseLocation, mouseX, mouseY);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // フローティングポイントのピクセルを読み取る
        const pixels = new Float32Array(4);
        gl.readPixels(
            Math.floor(mouseX),
            Math.floor(mouseY),
            1, 1,
            gl.RGBA,
            gl.FLOAT,
            pixels
        );

        // ピクセルデータをデコード
        const decodedValue = decodeValue(pixels);
        if (decodedValue) {
            outputDiv.textContent = decodedValue;
        } else {
            outputDiv.textContent = '';
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function decodeValue(pixels) {
    const typeIndicator = pixels[3];
    if (typeIndicator === 1.0) {
        // float
        return `float: ${pixels[0]}`;
    } else if (typeIndicator === 2.0) {
        // vec2
        return `vec2: (${pixels[0]}, ${pixels[1]})`;
    } else if (typeIndicator === 3.0) {
        // vec3
        return `vec3: (${pixels[0]}, ${pixels[1]}, ${pixels[2]})`;
    } else if (typeIndicator === 4.0) {
        // vec4
        return `vec4: (${pixels[0]}, ${pixels[1]}, ${pixels[2]}, ${pixels[3]})`;
    } else {
        return null;
    }
}

editor.addEventListener('input', compileShader);
compileShader();
