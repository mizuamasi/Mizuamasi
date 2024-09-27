uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

in vec2 fragCoord;
out vec4 fragColor;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // ピクセルの座標を0から1の範囲に正規化
    vec2 uv = fragCoord / iResolution.xy;
    
    // 音声データを取得
    float audioValue = texture(iChannel0, vec2(uv.x, 0.0)).r;
    
    // スペクトルバーの高さ
    float barHeight = audioValue;
    
    // バーの色
    vec3 color = vec3(0.0, barHeight, 1.0 - barHeight);
    
    // バーの描画
    if (uv.y < barHeight) {
        fragColor = vec4(color, 1.0);
    } else {
        fragColor = vec4(0.0);
    }
}