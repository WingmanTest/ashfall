// Builtin winter post: low-res blit + grade/vignette/grain/frost (canvas 2D overlay
// is also used; this shader path runs if we render through a RawShaderMaterial).
export const POST_VERT = /* glsl */ `#version 300 es
in vec2 position;
out vec2 vUv;
void main(){
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const POST_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D tColor;
uniform float uTime;
uniform float uNight;
uniform float uBlizzard;
uniform float uHurt;
uniform float uVignette;
uniform vec2 uRes;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

float bayer4(vec2 p){
  float x = mod(floor(p.x), 4.0);
  float y = mod(floor(p.y), 4.0);
  float m = 0.0;
  if (y < 1.0) {
    if (x < 1.0) m = 0.0; else if (x < 2.0) m = 8.0; else if (x < 3.0) m = 2.0; else m = 10.0;
  } else if (y < 2.0) {
    if (x < 1.0) m = 12.0; else if (x < 2.0) m = 4.0; else if (x < 3.0) m = 14.0; else m = 6.0;
  } else if (y < 3.0) {
    if (x < 1.0) m = 3.0; else if (x < 2.0) m = 11.0; else if (x < 3.0) m = 1.0; else m = 9.0;
  } else {
    if (x < 1.0) m = 15.0; else if (x < 2.0) m = 7.0; else if (x < 3.0) m = 13.0; else m = 5.0;
  }
  return m / 16.0;
}

void main(){
  vec2 uv = vUv;
  // slight CRT barrel
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + 0.04 * dot(c,c);
  uv = c * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.02,0.03,0.04,1.0);
    return;
  }
  vec3 col = texture(tColor, uv).rgb;
  // winter grade
  col.r *= 0.92;
  col.b *= 1.08;
  col = mix(col, col * vec3(0.55, 0.62, 0.85), uNight * 0.55);
  col = mix(col, col * vec3(0.85, 0.88, 0.95) + vec3(0.08,0.09,0.12), uBlizzard * 0.35);
  // frost on edges in blizzard
  float edge = smoothstep(0.35, 0.95, length(c));
  col = mix(col, vec3(0.82, 0.88, 0.95), edge * uBlizzard * 0.28);
  // hurt flash
  col = mix(col, vec3(0.6, 0.05, 0.05), uHurt * 0.45);
  // vignette
  float vig = smoothstep(0.95, 0.25, length(c));
  col *= mix(1.0, vig, uVignette);
  // grain + dither
  float g = hash(uv * uRes + fract(uTime * 13.7)) - 0.5;
  col += g * 0.06;
  col += (bayer4(uv * uRes) - 0.5) / 32.0;
  // mild scan
  col *= 0.93 + 0.07 * sin(uv.y * uRes.y * 3.14159);
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
