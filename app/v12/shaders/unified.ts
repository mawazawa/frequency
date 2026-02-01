// ═══════════════════════════════════════════════════════════════════
// UNIFIED SHADER — Single particle system: Lines → Chladni Field
// ═══════════════════════════════════════════════════════════════════

export const unifiedVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uMorph;        // 0 = lines, 1 = full Chladni field
  uniform float uFadeIn;       // 0→1 over first 2s
  uniform float uAudioActive;
  uniform float uN;
  uniform float uM;
  uniform int uShapeFn;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying float vDisplacement;
  varying vec2 vUv;
  varying float vDist;
  varying float vMorph;
  varying float vEnvelope;

  // ── Hash noise ──
  float hash(vec2 p) {
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));
  }
  float noise(vec2 x) {
    vec2 i = floor(x); vec2 f = fract(x);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }

  // ── Chladni pattern ──
  float chladni(vec2 p, float n, float m, float a, float b) {
    float PI = 3.14159265;
    return a*sin(PI*n*p.x)*sin(PI*m*p.y) + b*sin(PI*m*p.x)*sin(PI*n*p.y);
  }

  void main() {
    vUv = uv;
    vMorph = uMorph;
    vec2 pos = uv * 2.0 - 1.0;  // -1 to 1
    vDist = length(pos);
    float t = uTime;

    // ── Shape envelope (tapers edges for organic form) ──
    float edgeFadeX = 1.0 - pow(abs(pos.x), 2.4);
    float edgeFadeY = 1.0 - pow(abs(pos.y), 2.0);
    float envelope = edgeFadeX * edgeFadeY;
    vEnvelope = envelope;

    // ════════════════════════════════════════════
    // LINE DISPLACEMENT (morph = 0)
    // ════════════════════════════════════════════

    float terrain = 0.0;
    terrain += noise(pos * 2.0 + vec2(0.3, 0.0)) * 1.2;
    terrain += noise(pos * 4.0 + vec2(1.7, 0.5)) * 0.5;
    terrain += noise(pos * 8.0 + vec2(-2.1, 1.0)) * 0.2;
    terrain *= envelope;

    float breath = sin(t * 0.8 + pos.x * 6.28) * 0.08
                 + sin(t * 0.5 + pos.y * 6.28) * 0.05;
    breath *= envelope;

    float dist = length(pos);
    float bassRipple = sin(dist * 6.0 - t * 3.0) * uBass * 0.8;
    float midRipple  = sin(dist * 12.0 - t * 5.0) * uMid * 0.5
                     + sin(dist * 18.0 - t * 7.0 + 1.0) * uMid * 0.25;
    float highRipple = noise(vec2(pos.x * 30.0 + t * 3.0, pos.y * 20.0)) * uHigh * 0.3;
    float audioLine = (bassRipple + midRipple + highRipple) * envelope;

    float lineDisp = terrain * 0.7 + breath + audioLine;

    // ════════════════════════════════════════════
    // FIELD DISPLACEMENT (morph = 1)
    // ════════════════════════════════════════════

    float n = uN + uBass * 2.0;
    float m = uM + uMid * 3.0;
    float chladni1 = chladni(pos, n, m, 1.0, -1.0);
    float chladni2 = chladni(pos, n + 2.0, m + 1.0, 0.5, 0.5);
    float fieldDisp = 0.0;

    if (uShapeFn == 0) {
      fieldDisp = chladni1 * (0.5 + uVolume * 2.5);
      fieldDisp += chladni2 * uBass * 0.5;
      fieldDisp *= 1.0 + sin(t * 0.5) * 0.15;
    } else if (uShapeFn == 1) {
      float crystal = chladni(pos, floor(n), floor(m), 1.0, 1.0);
      vec2 grid = abs(fract(pos * (3.0 + uBass)) - 0.5);
      float gridP = 1.0 - max(grid.x, grid.y);
      fieldDisp = mix(crystal, gridP, 0.5) * (0.5 + uVolume * 3.0);
      fieldDisp *= cos(t * 1.5 + vDist * 4.0);
      fieldDisp += uMid * noise(pos * 10.0 + t) * 1.5;
    } else {
      float turb = chladni1 + 0.5 * chladni2;
      float n1 = noise(pos * 4.0 + t * 0.5);
      fieldDisp = (turb * 0.6 + n1 * 0.4) * (0.5 + uVolume * 4.0);
      fieldDisp += sin(vDist * 8.0 - t) * uMid * 2.0;
      fieldDisp += uHigh * noise(pos * 20.0 + t * 2.0) * 1.5;
    }

    // ════════════════════════════════════════════
    // MORPH: blend and position
    // ════════════════════════════════════════════

    vec3 newPos = position;
    float yScale = mix(0.08, 1.0, uMorph);
    newPos.y *= yScale;
    newPos.y += lineDisp * (1.0 - uMorph);
    newPos.z += fieldDisp * uMorph;

    float bandNoise = noise(pos * 5.0 + t) * 0.3 * uMorph * (1.0 - uMorph) * 4.0;
    newPos.y += bandNoise;

    float totalDisp = abs(lineDisp * (1.0 - uMorph)) + abs(fieldDisp * uMorph);
    vDisplacement = totalDisp;

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    float lineSize = 1.8 + uMid * 1.0;
    float fieldSize = 2.0 + uMid * 4.0 + vDisplacement * 1.5;
    float baseSize = mix(lineSize, fieldSize, uMorph);
    gl_PointSize = baseSize * (8.0 / -mvPosition.z);
    gl_PointSize *= uFadeIn;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const unifiedFragmentShader = /* glsl */ `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uMid;
  uniform float uFadeIn;
  uniform float uAudioActive;

  varying float vDisplacement;
  varying float vDist;
  varying float vMorph;
  varying float vEnvelope;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;

    float brightness = 0.75 + vDisplacement * 0.5;
    brightness = min(brightness, 1.0);
    vec3 lineColor = vec3(brightness, brightness, brightness * 1.02);
    float lineGlow = 1.8;

    vec3 fieldColor = mix(uColor1, uColor2, smoothstep(0.0, 1.5, vDisplacement));
    float fieldGlow = 1.0 + uMid * 1.5;

    vec3 color = mix(lineColor * lineGlow, fieldColor * fieldGlow, vMorph);

    float edgeAlpha = 1.0 - smoothstep(0.6, 1.0, vDist);
    float lineAlpha = (vEnvelope * 0.3 + 0.7) * 0.85;
    lineAlpha += vDisplacement * 0.3 * uAudioActive;
    float fieldAlpha = 1.0;
    float alpha = mix(lineAlpha, fieldAlpha, vMorph) * edgeAlpha;
    alpha *= uFadeIn;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ═══════════════════════════════════════════════════════════════════
// ETHER BACKGROUND PARTICLES
// ═══════════════════════════════════════════════════════════════════

export const etherVertexShader = /* glsl */ `
  uniform float uTime; uniform float uMorph; uniform float uMid;
  attribute vec3 aRandom;
  void main() {
    vec3 pos = position;
    pos.x += sin(uTime*0.5*aRandom.x)*0.5;
    pos.y += cos(uTime*0.3*aRandom.y)*0.5;
    pos.z += uMid*aRandom.z*5.0;
    pos.y *= mix(0.08, 1.0, pow(uMorph, 2.0));
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.5+aRandom.z+uMid*2.0)*(6.0/-mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const etherFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    if (length(gl_PointCoord-0.5)>0.5) discard;
    gl_FragColor = vec4(uColor, 0.35);
  }
`;
