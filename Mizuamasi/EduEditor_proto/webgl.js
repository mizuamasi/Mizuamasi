export const vertexShaderSource = `#version 300 es
in vec4 a_position;
void main() {
    gl_Position = a_position;
}`;

export function initWebGL(gl, fragmentShaderSource) {
    const { modifiedSource, printStatements } = convertPrintToComments(fragmentShaderSource);

    const vertexShaderResult = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShaderResult = compileShader(gl, gl.FRAGMENT_SHADER, modifiedSource);

    if (vertexShaderResult.error) {
        return { error: 'Vertex shader compilation error: ' + vertexShaderResult.error };
    }
    if (fragmentShaderResult.error) {
        return { error: 'Fragment shader compilation error: ' + fragmentShaderResult.error };
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShaderResult.shader);
    gl.attachShader(program, fragmentShaderResult.shader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const errorMsg = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        return { error: 'Shader program link error: ' + errorMsg };
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    return { program, printStatements, originalSource: fragmentShaderSource };
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const errorMsg = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        return { error: errorMsg };
    }

    return { shader };
}

export function resizeCanvas(gl) {
    const displayWidth = gl.canvas.clientWidth;
    const displayHeight = gl.canvas.clientHeight;

    if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
        gl.canvas.width = displayWidth;
        gl.canvas.height = displayHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}

export function renderFrame(gl, program, time) {
    gl.useProgram(program);

    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    gl.uniform1f(iTimeLocation, time * 0.001);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function convertPrintToComments(shaderSource) {
    if (!shaderSource.includes('#version 300 es')) {
        shaderSource = '#version 300 es\nprecision highp float;\n' + shaderSource;
    }
    
    if (!shaderSource.includes('out vec4 fragColor;')) {
        shaderSource = shaderSource.replace('void main()', 'out vec4 fragColor;\n\nvoid main()');
    }

    let printStatements = [];
    let modifiedSource = shaderSource.replace(/print\s*\(\s*(\w+)\s*\)\s*;/g, (match, arg, offset) => {
        printStatements.push({ name: arg, offset: offset });
        return ''; // print文を削除
    });

    return { modifiedSource, printStatements };
}

export function print_impl(label, value) {
    window.print(label, value);
}