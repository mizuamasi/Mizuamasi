// common.js
let camera, scene, renderer, material;
let editor, errorMarker;
let resolutionSlider;
let canvasContainer;

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
    let userCode;
    if (editor) {
        userCode = editor.getValue();
    } else {
        userCode = document.getElementById('default-fragment-shader').textContent;
    }
    return `
        uniform vec3 iResolution;
        uniform float iTime;

        ${userCode}

        void main() {
            vec4 fragColor;
            mainImage(fragColor, gl_FragCoord.xy);
            gl_FragColor = fragColor;
        }
    `;
}

function initAceEditor() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/glsl");
    editor.setValue(document.getElementById('default-fragment-shader').textContent);
    editor.clearSelection();

    editor.session.on('change', function() {
        updateShader();
    });
}

function updateShader() {
    const fragmentShader = getFullFragmentShader();
    try {
        const newMaterial = new THREE.ShaderMaterial({
            uniforms: material.uniforms,
            vertexShader: material.vertexShader,
            fragmentShader: fragmentShader
        });
        
        renderer.compile(scene, camera);
        
        material.fragmentShader = fragmentShader;
        material.needsUpdate = true;

        if (errorMarker) {
            editor.session.removeMarker(errorMarker);
            errorMarker = null;
        }
        editor.session.clearAnnotations();
    } catch (error) {
        console.error('Shader compilation error:', error);
        displayError(error.message);
    }
}

function displayError(message) {
    const match = message.match(/ERROR: (\d+):(\d+):/);
    if (match) {
        const line = parseInt(match[2]) - 1;
        const column = parseInt(match[3]);

        if (errorMarker) {
            editor.session.removeMarker(errorMarker);
        }
        errorMarker = editor.session.addMarker(new ace.Range(line, 0, line, Infinity), "ace_error-line", "fullLine");

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

function initResolutionSlider() {
    resolutionSlider = document.getElementById('resolution-slider');
    if (resolutionSlider) {
        resolutionSlider.addEventListener('input', updateRendererSize);
    }
}

function init() {
    initResolutionSlider();
    initAceEditor();
    initThree();
    animate();
}

window.addEventListener('load', init);