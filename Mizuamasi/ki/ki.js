const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGLをサポートしていないブラウザです。');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// シェーダープログラムの作成
const vertexShaderSource = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
    vNormal = normalMatrix * normal;
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 lightDirection;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform float shininess;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
    vec3 normalizedNormal = normalize(vNormal);
    vec3 lightDir = normalize(-lightDirection);
    float lambertian = max(dot(normalizedNormal, lightDir), 0.0);
    vec3 viewDir = normalize(-vPosition);
    vec3 reflectDir = reflect(-lightDir, normalizedNormal);
    float specular = pow(max(dot(reflectDir, viewDir), 0.0), shininess);
    vec3 color = ambientColor + lambertian * diffuseColor + specular * specularColor;
    gl_FragColor = vec4(color, 1.0);
}`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
}

// プレーンのメッシュを作成
const vertices = [
    // 座標           // 法線
    -10.0, 0.0,
    10.0, 0.0, 1.0, 0.0,
    10.0, 0.0, 10.0, 0.0, 1.0, 0.0,
    10.0, 0.0, -10.0, 0.0, 1.0, 0.0, -10.0, 0.0, -10.0, 0.0, 1.0, 0.0
];

const indices = [
    0, 1, 2,
    0, 2, 3
];

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
const normalLocation = gl.getAttribLocation(shaderProgram, 'normal');

gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
gl.enableVertexAttribArray(positionLocation);

gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
gl.enableVertexAttribArray(normalLocation);

// ライトとマテリアルのプロパティ
const lightDirection = [2.0, 4.0, 8.0];
const ambientColor = [0.2, 0.2, 0.2];
const diffuseColor = [0.8, 0.8, 0.8];
const specularColor = [1.0, 1.0, 1.0];
const shininess = 16.0;

// モデルビューとプロジェクション行列
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
mat4.lookAt(modelViewMatrix, [0, 1, 0], [0, 0, 0], [0, 0, -1]);
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

const modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, 'modelViewMatrix');
const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, 'projectionMatrix');
const normalMatrixLocation = gl.getUniformLocation(shaderProgram, 'normalMatrix');
const lightDirectionLocation = gl.getUniformLocation(shaderProgram, 'lightDirection');
const ambientColorLocation = gl.getUniformLocation(shaderProgram, 'ambientColor');
const diffuseColorLocation = gl.getUniformLocation(shaderProgram, 'diffuseColor');
const specularColorLocation = gl.getUniformLocation(shaderProgram, 'specularColor');
const shininessLocation = gl.getUniformLocation(shaderProgram, 'shininess');

function render() {
    resizeCanvas();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(shaderProgram);

    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    gl.uniformMatrix3fv(normalMatrixLocation, false, mat3.normalFromMat4(mat3.create(), modelViewMatrix));
    gl.uniform3fv(lightDirectionLocation, lightDirection);
    gl.uniform3fv(ambientColorLocation, ambientColor);
    gl.uniform3fv(diffuseColorLocation, diffuseColor);
    gl.uniform3fv(specularColorLocation, specularColor);
    gl.uniform1f(shininessLocation, shininess);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(normalLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}
render();

// ユーティリティ関数
function mat3.normalFromMat4(out, a) {
    let det = a[0] * (a[5] * a[10] - a[6] * a[9]) +
        a[1] * (a[6] * a[8] - a[4] * a[10]) +
        a[2] * (a[4] * a[9] - a[5] * a[8]);
    if (det === 0) {
        return null;
    }
    det = 1.0 / det;

    out[0] = det * (a[5] * a[10] - a[6] * a[9]);
    out[1] = det * (a[2] * a[9] - a[1] * a[10]);
    out[2] = det * (a[1] * a[6] - a[2] * a[5]);

    out[3] = det * (a[6] * a[8] - a[4] * a[10]);
    out[4] = det * (a[0] * a[10] - a[2] * a[8]);
    out[5] = det * (a[2] * a[4] - a[0] * a[6]);

    out[6] = det * (a[4] * a[9] - a[5] * a[8]);
    out[7] = det * (a[1] * a[8] - a[0] * a[9]);
    out[8] = det * (a[0] * a[5] - a[1] * a[4]);

    return out;
}