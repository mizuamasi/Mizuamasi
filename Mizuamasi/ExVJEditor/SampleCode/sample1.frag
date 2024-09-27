// sample1.frag
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 iMouse;

// mainImage関数の定義
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // ピクセルの座標を0から1の範囲に正規化
    vec2 uv = fragCoord / iResolution.xy;
    // 時間と座標に基づいて色を計算
    vec3 color = 0.5 + 0.5 * sin(iTime + uv.xyx + vec3(0, 2, 4));
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
