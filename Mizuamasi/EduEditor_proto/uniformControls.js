let uniformControls = {};

export function initUniformControls(gl, program) {
    if (!program || !(program instanceof WebGLProgram)) {
        console.error('Invalid WebGLProgram provided to initUniformControls');
        return;
    }
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const controlsContainer = document.getElementById('uniform-controls');
    controlsContainer.innerHTML = ''; // Clear existing controls

    for (let i = 0; i < uniformCount; i++) {
        const uniformInfo = gl.getActiveUniform(program, i);
        if (!uniformInfo) continue;

        const { name, type } = uniformInfo;

        // Skip built-in uniforms
        if (name.startsWith('i') && ['iTime', 'iResolution', 'iMouse', 'iChannel0', 'iDate', 'iKeyboard'].includes(name)) {
            continue;
        }

        const location = gl.getUniformLocation(program, name);
        let control;

        switch (type) {
            case gl.FLOAT:
                control = createSlider(name, -1, 1, 0.01);
                break;
            case gl.FLOAT_VEC2:
                control = create2DController(name);
                break;
            case gl.FLOAT_VEC3:
                control = createColorPicker(name);
                break;
            case gl.FLOAT_VEC4:
                control = createColorPickerWithAlpha(name);
                break;
            case gl.INT:
                control = createIntSlider(name, -10, 10, 1);
                break;
            case gl.BOOL:
                control = createCheckbox(name);
                break;
            default:
                console.warn(`Unsupported uniform type for ${name}`);
                continue;
        }

        controlsContainer.appendChild(control);
        uniformControls[name] = { type, location, control };
    }
}

export function updateUniformControls(gl, program) {
    for (const [name, { type, location, control }] of Object.entries(uniformControls)) {
        switch (type) {
            case gl.FLOAT:
                gl.uniform1f(location, parseFloat(control.querySelector('input').value));
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2f(location,
                    parseFloat(control.querySelector('.x-input').value),
                    parseFloat(control.querySelector('.y-input').value)
                );
                break;
            case gl.FLOAT_VEC3:
            case gl.FLOAT_VEC4:
                const color = hexToRgb(control.querySelector('input').value);
                if (type === gl.FLOAT_VEC3) {
                    gl.uniform3f(location, color.r / 255, color.g / 255, color.b / 255);
                } else {
                    const alpha = parseFloat(control.querySelector('.alpha-input').value);
                    gl.uniform4f(location, color.r / 255, color.g / 255, color.b / 255, alpha);
                }
                break;
            case gl.INT:
                gl.uniform1i(location, parseInt(control.querySelector('input').value));
                break;
            case gl.BOOL:
                gl.uniform1i(location, control.querySelector('input').checked ? 1 : 0);
                break;
        }
    }
}

function createSlider(name, min, max, step) {
    const container = document.createElement('div');
    container.innerHTML = `
        <label for="${name}">${name}</label>
        <input type="range" id="${name}" name="${name}" min="${min}" max="${max}" step="${step}">
        <span class="value"></span>
    `;
    const slider = container.querySelector('input');
    const valueDisplay = container.querySelector('.value');
    slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
    });
    return container;
}

function createIntSlider(name, min, max, step) {
    const container = createSlider(name, min, max, step);
    container.querySelector('input').setAttribute('type', 'range');
    return container;
}

function createColorPicker(name) {
    const container = document.createElement('div');
    container.innerHTML = `
        <label for="${name}">${name}</label>
        <input type="color" id="${name}" name="${name}">
    `;
    return container;
}

function createColorPickerWithAlpha(name) {
    const container = document.createElement('div');
    container.innerHTML = `
        <label for="${name}">${name}</label>
        <input type="color" id="${name}" name="${name}">
        <input type="range" class="alpha-input" min="0" max="1" step="0.01" value="1">
    `;
    return container;
}

function create2DController(name) {
    const container = document.createElement('div');
    container.innerHTML = `
        <label>${name}</label>
        <div>
            <label for="${name}-x">X:</label>
            <input type="number" id="${name}-x" class="x-input" step="0.1" value="0">
        </div>
        <div>
            <label for="${name}-y">Y:</label>
            <input type="number" id="${name}-y" class="y-input" step="0.1" value="0">
        </div>
    `;
    return container;
}

function createCheckbox(name) {
    const container = document.createElement('div');
    container.innerHTML = `
        <label for="${name}">${name}</label>
        <input type="checkbox" id="${name}" name="${name}">
    `;
    return container;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}