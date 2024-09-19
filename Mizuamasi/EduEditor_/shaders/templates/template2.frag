// template2.frag

uniform float time;
uniform vec2 resolution;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    float len = length(uv);
    float color = sin(len * 10.0 - time * 2.0);
    gl_FragColor = vec4(vec3(color), 1.0);
}
