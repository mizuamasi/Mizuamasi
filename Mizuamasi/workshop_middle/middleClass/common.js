// common.js
let camera, scene, renderer, material;
let editor, errorMarker;
let resolutionSlider;
let canvasContainer;
let errorSummaryElement;

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer({antialias: false});
    canvasContainer = document.getElementById('shader-demo');
    canvasContainer.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector3() }
        },
        vertexShader: `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: getFullFragmentShader()
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    updateRendererSize();
}

function updateRendererSize() {
    const scale = resolutionSlider ? parseFloat(resolutionSlider.value) : 1;
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    const width = Math.max(1, Math.floor(containerWidth * scale));
    const height = Math.max(1, Math.floor(containerHeight * scale));
    
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    const resolutionValueElement = document.getElementById('resolution-value');
    if (resolutionValueElement) {
        resolutionValueElement.textContent = `${width}x${height} (${(scale * 100).toFixed(1)}%)`;
    }
}

function getFullFragmentShader() {
    let userCode = editor ? editor.getValue() : document.getElementById('default-fragment-shader').textContent;
    
    return `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3 iResolution;
uniform float iTime;

${userCode}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;
}

function initAceEditor() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/glsl");
    editor.setValue(`void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    // Output to screen
    fragColor = vec4(col,1.0);
}`);
    editor.clearSelection();

    editor.session.on('change', debounce(updateShader, 300));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateShader() {
    const fragmentShader = getFullFragmentShader();
    try {
        // シェーダーのコンパイルをテスト
        const testMaterial = new THREE.ShaderMaterial({
            uniforms: material.uniforms,
            vertexShader: material.vertexShader,
            fragmentShader: fragmentShader
        });
        
        // コンパイルエラーをチェック
        const gl = renderer.getContext();
        const glShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(glShader, fragmentShader);
        gl.compileShader(glShader);
        
        if (!gl.getShaderParameter(glShader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(glShader);
            throw new Error(error);
        }
        
        // エラーがなければシェーダーを更新
        material.fragmentShader = fragmentShader;
        material.needsUpdate = true;
        
        clearError();
    } catch (error) {
        console.error('Shader compilation error:', error);
        displayError(error.message);
    }
}

function displayError(message) {
    if (errorMarker) {
        editor.session.removeMarker(errorMarker);
    }
    editor.session.clearAnnotations();

    const errorRegex = /ERROR: \d+:(\d+): (.*)/;
    const errorMatch = message.match(errorRegex);

    if (errorMatch) {
        const [, lineStr, errorMsg] = errorMatch;
        const line = parseInt(lineStr, 10) - 1;

        errorMarker = editor.session.addMarker(
            new ace.Range(line, 0, line, Infinity),
            "ace_error-line",
            "fullLine"
        );

        editor.session.setAnnotations([{
            row: line,
            column: 0,
            text: translateErrorMessage(errorMsg),
            type: "error"
        }]);

        showErrorSummary(`行 ${lineStr}: ${translateErrorMessage(errorMsg)}`);
    } else {
        console.error("シェーダーエラー:", message);
        
        showErrorSummary(translateErrorMessage(message));
    }
}

function clearError() {
    if (errorMarker) {
        editor.session.removeMarker(errorMarker);
        errorMarker = null;
    }
    editor.session.clearAnnotations();
    hideErrorSummary();
}

function showErrorSummary(message) {
    errorSummaryElement.textContent = message;
    errorSummaryElement.style.display = 'block';
}

function hideErrorSummary() {
    errorSummaryElement.style.display = 'none';
}

function translateErrorMessage(message) {
    const translations = {
        'syntax error': '構文エラー: コードの書き方を確認してください。',
        'undeclared identifier': '未宣言の識別子: 変数や関数が宣言されているか確認してください。',
        'type mismatch': '型の不一致: 変数の型が正しいか確認してください。',
        'No precision specified for (float)': '浮動小数点数の精度が指定されていません。この問題は自動的に解決されます。',
        "'mainImage' : no matching overloaded function found": 'mainImage関数の定義が見つかりません。関数の宣言を確認してください。',
        "'fragColor' : undeclared identifier": 'fragColorが未定義です。mainImage関数の引数を確認してください。',
        "'fragCoord' : undeclared identifier": 'fragCoordが未定義です。mainImage関数の引数を確認してください。',
    };

    for (const [key, value] of Object.entries(translations)) {
        if (message.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    return `エラー: ${message}\n修正のヒント: コードを見直し、文法ミスがないか確認してください。`;
}

function animate() {
    requestAnimationFrame(animate);
    material.uniforms.iTime.value += 0.05;
    material.uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
    renderer.render(scene, camera);
}

function initResolutionSlider() {
    resolutionSlider = document.getElementById('resolution-slider');
    if (resolutionSlider) {
        resolutionSlider.addEventListener('input', updateRendererSize);
    }
}

function initErrorHandling() {
    errorSummaryElement = document.createElement('div');
    errorSummaryElement.id = 'error-summary';
    document.getElementById('editor-container').appendChild(errorSummaryElement);
}

function init() {
    initResolutionSlider();
    initAceEditor();
    initErrorHandling();
    initThree();
    animate();
}

window.addEventListener('load', init);