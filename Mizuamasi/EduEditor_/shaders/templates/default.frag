/*
iTime: シェーダーの実行時間（秒）
iResolution: 画面の解像度（ピクセル）
iMouse: マウス座標（ピクセル）
iChannel0: オーディオ入力（テクスチャ）
iDate: 現在の日付と時間
iKeyboard: キーボード入力状態

ShaderToyの機能を実装しています。

デバッグ用に print("デバッグ名", 変数); を使用できます。

ユニフォーム変数の定義時に、オプションをコメントで指定できます。
例:
uniform vec3 u_color; // option: colorPicker
uniform vec2 u_position; // option: 2DController
*/

uniform float u_timeScale; // option: slider
uniform vec3 u_color; // option: colorPicker
uniform vec2 u_position2D; // option: 2DController
uniform vec3 u_position3D; // option: 3DController

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / iResolution.xy;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5 * cos(iTime * u_timeScale + uv.xyx + vec3(0, 2, 4));

    // デバッグ用の変数
    float brightness = length(col);
    print("Brightness", brightness);

    // Output to screen
    fragColor = vec4(col * u_color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
