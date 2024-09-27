// shader-demo.js
let camera, scene, renderer, material;
let editor, errorMarker;
let resolutionScale = 1;

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer();
    updateRendererSize();
    document.getElementById('shader-demo').appendChild(renderer.domElement);

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
        fragmentShader: getDefaultFragmentShader()
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

function updateRendererSize() {
    const width = document.getElementById('shader-demo').clientWidth * resolutionScale;
    const height = document.getElementById('shader-demo').clientHeight * resolutionScale;
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
}

function getDefaultFragmentShader() {
    return `
        uniform vec3 iResolution;
        uniform float iTime;

        void mainImage( out vec4 fragColor, in vec2 fragCoord )
        {
            vec2 uv = fragCoord/iResolution.xy;
            float time = iTime;
            
            float r = sin(time) * 0.5 + 0.5;
            float g = cos(time) * 0.5 + 0.5;
            
            fragColor = vec4(r, g, uv.y, 1.0);
        }

        void main() {
            mainImage(gl_FragColor, gl_FragCoord.xy);
        }
    `;
}

function initAceEditor() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/glsl");
    editor.setValue(getDefaultFragmentShader());
    editor.clearSelection();

    editor.session.on('change', function() {
        updateShader();
    });
}

function updateShader() {
    const fragmentShader = editor.getValue();
    try {
        const newMaterial = new THREE.ShaderMaterial({
            uniforms: material.uniforms,
            vertexShader: material.vertexShader,
            fragmentShader: fragmentShader
        });
        
        // テストレンダリングを行ってエラーをチェック
        renderer.compile(scene, camera);
        
        // エラーがなければ新しいマテリアルを適用
        material.fragmentShader = fragmentShader;
        material.needsUpdate = true;

        // エラーマーカーを削除
        if (errorMarker) {
            editor.session.removeMarker(errorMarker);
            errorMarker = null;
        }
    } catch (error) {
        console.error('Shader compilation error:', error);
        displayError(error.message);
    }
}

function displayError(message) {
    // エラーメッセージからエラーの行番号を抽出
    const match = message.match(/ERROR: (\d+):(\d+):/);
    if (match) {
        const line = parseInt(match[2]) - 1; // エディターの行番号は0から始まるため-1
        const column = parseInt(match[3]);

        // エラー行にマーカーを設定
        if (errorMarker) {
            editor.session.removeMarker(errorMarker);
        }
        errorMarker = editor.session.addMarker(new ace.Range(line, 0, line, Infinity), "ace_error-line", "fullLine");

        // エラーメッセージをエディターに表示
        editor.session.setAnnotations([{
            row: line,
            column: column,
            text: message,
            type: "error"
        }]);
    }
}

function animate() {
    requestAnimationFrame(animate);
    material.uniforms.iTime.value += 0.05;
    material.uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
    renderer.render(scene, camera);
}

function changeResolution(scale) {
    resolutionScale = scale;
    updateRendererSize();
}

function init() {
    initThree();
    initAceEditor();
    animate();

    // 解像度変更ボタンのイベントリスナーを設定
    document.getElementById('low-res').addEventListener('click', () => changeResolution(0.25));
    document.getElementById('medium-res').addEventListener('click', () => changeResolution(0.5));
    document.getElementById('high-res').addEventListener('click', () => changeResolution(1));
}

window.addEventListener('load', init);