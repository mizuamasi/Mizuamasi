uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

//回転
mat2 rot(float a){return mat2(cos(a),sin(a),-sin(a),cos(a));}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // ピクセルの座標を0から1の範囲に正規化
    vec2 uv = fragCoord / iResolution.xy;
    
    
    // 音声データを取得
    float audioValue = texture(iChannel0, vec2(uv.x, 0.0)).r;

    uv *= rot(audioValue);
    //背景(適当な組み合わせ)
    vec3 color = clamp(sin(uv.yyy * 10. + iTime * 10. + fract(uv.x * 10.) + step(mod(uv.x * 10. , 2.),0.5) ) ,0.,1.);
    color /= 3.;

    
    // スペクトルバーの高さ
    float barHeight = audioValue;
    
    // バーの色
    vec3 bar = vec3(0.0, barHeight, 1.0 - barHeight);
    
    // バーの描画
    if (uv.y < barHeight) {
        bar += color;
    } else {
        bar = vec3(0.0);
    }
    //バーが出る位置に背景色を強く出す　バーに関係なく背景色はうっすら載せとく
    fragColor = vec4(color * bar + color/5.,1.);
}