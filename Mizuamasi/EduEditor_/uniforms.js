// uniforms.js

import { startTime } from './shader.js';
import { updateShader } from './shader.js';

export let uniforms = {};
export let uniformDefinitions = {};
export let existingUniforms = {};

export function resetUniformDefinitions() {
    uniformDefinitions = {};
}

export function resetExistingUniforms() {
    existingUniforms = {};
}

export function generateUniformUI() {
    const controlPanel = document.getElementById('control-panel');
    if (!controlPanel) return;

    controlPanel.innerHTML = '';

    for (let name in uniformDefinitions) {
        const uniform = uniformDefinitions[name];
        const type = uniform.type;
        const value = uniform.value;
        const option = uniform.option || 'default';

        uniforms[name] = value;

        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const label = document.createElement('label');
        label.textContent = name;
        label.setAttribute('for', `uniform-${name}`);
        controlGroup.appendChild(label);

        if (type === 'float') {
            if (option === 'slider' || option === 'default') {
                const input = document.createElement('input');
                input.type = 'range';
                input.min = -10;
                input.max = 10;
                input.step = 0.01;
                input.value = value;
                input.id = `uniform-${name}`;
                input.addEventListener('input', (e) => {
                    uniforms[name] = parseFloat(e.target.value);
                    updateShader();
                });
                controlGroup.appendChild(input);

                const valueDisplay = document.createElement('span');
                valueDisplay.textContent = value;
                controlGroup.appendChild(valueDisplay);

                input.addEventListener('input', (e) => {
                    uniforms[name] = parseFloat(e.target.value);
                    valueDisplay.textContent = e.target.value;
                    updateShader();
                });
            }
        } else if (type === 'vec2') {
            if (option === '2DController') {
                create2DController(controlGroup, name, value);
            } else {
                // デフォルトのスライダーを使用（必要に応じて実装）
            }
        } else if (type === 'vec3') {
            if (option === '3DController') {
                create3DController(controlGroup, name, value);
            } else {
                // デフォルトのスライダーを使用（必要に応じて実装）
            }
        } else if (type === 'vec4') {
            // vec4の処理（必要に応じて実装）
        }

        controlPanel.appendChild(controlGroup);
    }
}

// 2Dコントローラーの作成
function create2DController(container, name, value) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.border = '1px solid #fff';
    canvas.id = `2d-controller-${name}`;

    const ctx = canvas.getContext('2d');

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        const x = (value[0] + 1) * 0.5 * canvas.width;
        const y = (1 - (value[1] + 1) * 0.5) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    draw();

    let isDragging = false;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateValue(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateValue(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function updateValue(e) {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
        const y = -(((e.clientY - rect.top) / canvas.height) * 2 - 1);
        value[0] = Math.max(-1, Math.min(1, x));
        value[1] = Math.max(-1, Math.min(1, y));
        uniforms[name] = value;
        draw();
        updateShader();
    }

    container.appendChild(canvas);
}

// 3Dコントローラーの作成（Three.jsを使用）
function create3DController(container, name, value) {
    // Three.jsのスクリプトが読み込まれていることを前提とします
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.border = '1px solid #fff';
    canvas.id = `3d-controller-${name}`;

    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(canvas.width, canvas.height);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 5;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    // キューブの作成
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeometry);
    const cubeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const cubeWireframe = new THREE.LineSegments(cubeEdges, cubeMaterial);
    scene.add(cubeWireframe);

    // 球体の作成
    const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // 初期位置の設定
    sphere.position.set(value[0], value[1], value[2]);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // マウスイベントの設定
    let isDragging = false;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();

    function onMouseDown(event) {
        isDragging = true;
        updateSpherePosition(event);
    }

    function onMouseMove(event) {
        if (isDragging) {
            updateSpherePosition(event);
        }
    }

    function onMouseUp() {
        isDragging = false;
    }

    function updateSpherePosition(event) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / canvas.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(cubeWireframe);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            sphere.position.copy(point);
            value[0] = point.x;
            value[1] = point.y;
            value[2] = point.z;
            uniforms[name] = value;
            updateShader();
        }
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// ユニフォームの設定
export function setUniforms(gl, shaderProgram) {
    if (!gl || !shaderProgram) {
        console.error('Invalid GL context or shader program');
        return;
    }

    const timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
    if (timeLocation !== null) {
        gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000.0);
    }

    const resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
    if (resolutionLocation !== null) {
        gl.uniform3f(resolutionLocation, gl.canvas.width, gl.canvas.height, 1.0);
    }

    // ユーザー定義のユニフォーム変数の設定
    for (let name in uniforms) {
        const location = gl.getUniformLocation(shaderProgram, name);
        if (location !== null) {
            const value = uniforms[name];
            if (Array.isArray(value)) {
                if (value.length === 2) {
                    gl.uniform2fv(location, value);
                } else if (value.length === 3) {
                    gl.uniform3fv(location, value);
                } else if (value.length === 4) {
                    gl.uniform4fv(location, value);
                }
            } else if (typeof value === 'boolean') {
                gl.uniform1i(location, value ? 1 : 0);
            } else if (typeof value === 'number') {
                gl.uniform1f(location, value);
            }
        }
    }
}
