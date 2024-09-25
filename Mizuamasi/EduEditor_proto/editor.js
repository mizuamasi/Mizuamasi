let editor;
let originalShaderCode;

export function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("shader-editor"), {
        mode: "x-shader/x-fragment",
        theme: "monokai",
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        autofocus: true
    });

    // デフォルトのシェーダーコード
    const defaultShaderCode = `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
    print(uv);
    print(col);
    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}`;

    editor.setValue(defaultShaderCode);
    originalShaderCode = defaultShaderCode;

    editor.on("change", () => {
        originalShaderCode = editor.getValue();
    });

    return editor;
}

export function getEditorCode() {
    return originalShaderCode || editor.getValue();
}

export function setEditorCode(code) {
    editor.setValue(code);
    originalShaderCode = code;
}