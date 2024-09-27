// sample2.frag
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 iMouse;

// mainImage関数の定義
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // ピクセルの座標を0から1の範囲に正規化
    vec2 uv = fragCoord / iResolution.xy;
    // 時間と座標に基づいて動く円を描画
    float radius = 0.3;
    vec2 center = vec2(0.5 + 0.3 * sin(iTime), 0.5 + 0.3 * cos(iTime));
    float dist = distance(uv, center);
    vec3 color = mix(vec3(0.0), vec3(1.0), smoothstep(radius, radius - 0.01, dist));
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
