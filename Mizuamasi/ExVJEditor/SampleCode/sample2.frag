// SampleCode/sample2.frag

precision mediump float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec2 iMouse;

// mainImage関数の定義
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Center coordinates
    vec2 center = iResolution.xy / 2.0;
    
    // Calculate distance from center
    float dist = distance(fragCoord, center);
    
    // Create a radial gradient
    float gradient = 1.0 - smoothstep(0.0, iResolution.x / 2.0, dist);
    
    // Apply time-based color change
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), gradient * 0.5 * (1.0 + sin(iTime)));

    fragColor = vec4(color, 1.0);

    // ピクセルの色値をコンソールに表示
    print(color, fragCoord);
}
