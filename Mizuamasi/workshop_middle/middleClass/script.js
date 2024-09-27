// script.js

/**
 * ページロード時に必要な初期化を行います。
 */
function initialize() {
    const editorContainers = document.querySelectorAll('.editor-container');
    editorContainers.forEach(container => {
        const editorElement = container.querySelector('.editor');
        const errorElement = container.querySelector('.error-message');
        if (editorElement && errorElement) {
            // エディタのIDからシェーダーデモのIDを推測
            const name = editorElement.id.replace('editor-', '');
            const containerId = `shader-demo-${name}`;
            const shaderDemo = document.getElementById(containerId);
            if (shaderDemo) {
                const initialCode = getInitialShaderCode(containerId);
                initEditor(editorElement.id, errorElement.id, initialCode);
            } else {
                console.warn(`Shader demo with id ${containerId} not found for editor ${editorElement.id}`);
            }
        }
    });

    setupControls();
}

document.addEventListener('DOMContentLoaded', initialize);


/**
 * ページごとの初期シェーダーコードを取得します。
 * @param {string} containerId - シェーダーデモを表示するコンテナのID
 * @returns {string} - 初期シェーダーコード
 */
function getInitialShaderCode(containerId) {
    switch(containerId) {
        case 'shader-demo-animation':
            return `// 時間とともに動く円を描くシェーダー
uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // 正規化座標に変換
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    // 円の中心を時間とともに左右に動かす
    vec2 center = vec2(sin(iTime) * 0.5, 0.0);
    // ピクセルから動く中心までの距離を計算
    float dist = length(uv - center);
    // 円の半径
    float radius = 0.2;
    // 円のエッジを滑らかにするための値
    float edge = 0.01;
    // 円の内外を判定
    float alpha = smoothstep(radius, radius - edge, dist);
    // 色を決定（青から透明へ）
    vec3 color = mix(vec3(0.0, 0.0, 1.0), vec3(1.0), alpha);

    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
        case 'shader-demo-basics':
            return `// 基本的なグラデーションシェーダー
uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // ピクセルの座標を0から1の範囲に正規化
    vec2 uv = fragCoord / iResolution.xy;
    // 水平方向のグラデーションを作成
    vec3 color = vec3(uv.x, 0.5, 1.0 - uv.x);
    
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
        case 'shader-demo-color-time':
            return `// 時間によって色が変化するシェーダー
uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // ピクセルの座標を0から1の範囲に正規化
    vec2 uv = fragCoord / iResolution.xy;
    // 時間と座標に基づいて色を計算
    vec3 color = 0.5 + 0.5 * sin(iTime + uv.xyx + vec3(0, 2, 4));

    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
        case 'shader-demo-coordinates':
            return `// 座標系を利用したシェーダー
uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // 中央を(0,0)にシフト
    vec2 centered = uv - 0.5;
    // グラデーションを中央から放射状に
    float dist = length(centered);
    vec3 color = vec3(dist, 0.5, 1.0 - dist);
    
    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
        case 'shader-demo-shape':
            return `// 中心に円を描くシェーダー
uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // 正規化座標に変換
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    // ピクセルから中心までの距離を計算
    float dist = length(uv);
    // 円の半径
    float radius = 0.3;
    // 円のエッジを滑らかにするための値
    float edge = 0.01;
    // 円の内外を判定
    float alpha = smoothstep(radius, radius - edge, dist);
    // 色を決定（赤から透明へ）
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0), alpha);

    if(showCoordinates){
        color = vec3(uv, 0.5 + 0.5 * sin(iTime));
    }

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
        case 'shader-demo-intro':
            return `// 初期グラデーションシェーダー
uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);

    if(showCoordinates){
        fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
    }
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
        // 他のデモタイプも必要に応じて追加
        default:
            return `uniform float iTime;
uniform vec3 iResolution;
uniform bool showCoordinates;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
    }
}

/**
 * エディターの初期化関数
 * @param {string} editorId - エディターのID
 * @param {string} errorId - エラーメッセージを表示する要素のID
 * @param {string} initialCode - 初期シェーダーコード
 */
function initEditor(editorId, errorId, initialCode) {
    const editor = ace.edit(editorId);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/glsl");
    editor.setOptions({
        fontSize: "14px",
        showLineNumbers: true,
        tabSize: 4,
        useWorker: true
    });

    // 初期シェーダーコードを設定
    editor.setValue(initialCode.trim(), -1); // カーソルを先頭に設定

    // シェーダーの更新とエラーチェック
    editor.on("change", function() {
        const code = editor.getValue();
        updateShader(editorId.replace('editor-', ''), code, errorId);
    });
}

/**
 * シェーダーコードを更新します。
 * @param {string} containerId - シェーダーデモを表示するコンテナのID
 * @param {string} newFragmentShader - 新しいフラグメントシェーダーコード
 * @param {string} errorId - エラーメッセージを表示する要素のID
 */
function updateShader(containerId, newFragmentShader, errorId) {
    if (scenes[containerId] && scenes[containerId].material) {
        const renderer = scenes[containerId].renderer;
        const gl = renderer.getContext();

        // 一時的にシェーダーをコンパイルしてエラーをチェック
        const tempFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(tempFragmentShader, newFragmentShader);
        gl.compileShader(tempFragmentShader);
        if (!gl.getShaderParameter(tempFragmentShader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(tempFragmentShader);
            document.getElementById(errorId).textContent = `エラー: ${error}`;
            gl.deleteShader(tempFragmentShader);
            return;
        } else {
            document.getElementById(errorId).textContent = '';
        }
        gl.deleteShader(tempFragmentShader);

        // シェーダーを更新
        scenes[containerId].material.fragmentShader = newFragmentShader;
        scenes[containerId].material.needsUpdate = true;
    }
}

// script.js

/**
 * 各ページのコントロールを設定します。
 */
function setupControls() {
    const controlElements = document.querySelectorAll('.controls');
    controlElements.forEach(control => {
        const resolutionSlider = control.querySelector('input[type="range"]');
        const showCoordinatesCheckbox = control.querySelector('input[type="checkbox"]');
        const containerId = control.parentElement.querySelector('.shader-demo').id;

        if (resolutionSlider) {
            resolutionSlider.addEventListener('input', () => {
                if (scenes[containerId]) {
                    const n = parseFloat(resolutionSlider.value); // n は 1 から 10
                    
                    const renderer = scenes[containerId].renderer;
                    const size = getContainerSize(containerId);
                    const width = size.width;
                    const height = size.height;
                    const minSide = Math.min(width, height);
                    const aspect = width / height;
                    
                    const iResolutionX = minSide / n;
                    const iResolutionY = aspect >= 1 ? (iResolutionX / aspect) : (iResolutionX * aspect);
                    
                    scenes[containerId].material.uniforms.iResolution.value.set(iResolutionX, iResolutionY, 1);
                }
            });
        }

        if (showCoordinatesCheckbox) {
            showCoordinatesCheckbox.addEventListener('change', () => {
                if (scenes[containerId]) {
                    scenes[containerId].material.uniforms.showCoordinates.value = showCoordinatesCheckbox.checked;
                }
            });
        }
    });
}


document.addEventListener('DOMContentLoaded', initialize);
