// SampleCode/sample2.frag

precision mediump float;

uniform vec3 iResolution;
uniform float iTime;

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / iResolution.xy;

    // Center coordinates
    vec2 center = vec2(0.5, 0.5);
    float radius = 0.3;

    // Calculate distance from center
    float dist = distance(uv, center);

    // Create a circle
    float circle = smoothstep(radius, radius - 0.01, dist);

    // Color inside the circle changes over time
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), sin(iTime) * 0.5 + 0.5);

    fragColor = vec4(color * (1.0 - circle), 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
