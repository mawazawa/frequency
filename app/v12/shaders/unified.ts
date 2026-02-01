// Unified Chladni field particle shader — Lines → Field morph

export const unifiedVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uMorph;        // 0 = lines, 1 = full Chladni field
  uniform float uFadeIn;
  uniform float uAudioActive;
  uniform float uN;
  uniform float uM;
  uniform float uShapeFn;
  varying float vDisp;
  varying float vMorph;
  varying vec2  vFieldUV;
  varying float vIsField;

  // ── Hash noise ──
  float hash(vec2 p) {
    float h = dot(p, vec2(127.1,311.7));
    return fract(sin(h)*43758.5453123);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }

  // ── Chladni pattern ──
  float chladni(vec2 uv, float n, float m, int shapeFn) {
    float x = uv.x; float y = uv.y;
    float val;
    if (shapeFn == 0) {
      val = cos(n*3.14159*x)*cos(m*3.14159*y) - cos(m*3.14159*x)*cos(n*3.14159*y);
    } else if (shapeFn == 1) {
      val = sin(n*3.14159*x)*sin(m*3.14159*y) + sin(m*3.14159*x)*sin(n*3.14159*y);
    } else {
      val = cos(n*3.14159*x)*sin(m*3.14159*y) - sin(m*3.14159*x)*cos(n*3.14159*y);
    }
    return val;
  }

  void main() {
    vec2 planeUV = position.xy / 4.0;
    vFieldUV = planeUV;

    // ── Shape envelope (tapers edges for organic form) ──
    float r = length(planeUV);
    float envelope = smoothstep(1.1, 0.4, r);

    // ════════════════════════════════════════════
    // LINES STATE (morph = 0): horizontal sound lines
    // ════════════════════════════════════════════
    // Terrain hills + breathing + audio ripples
    float terrain = noise2D(planeUV * 2.0 + vec2(0, uTime * 0.1)) * 0.5
                  + noise2D(planeUV * 4.0 + vec2(uTime * 0.05, 0)) * 0.25;
    float breath = sin(uTime * 0.3 + planeUV.x * 2.0) * 0.1;

    float bassRipple = uBass * sin(planeUV.x * 8.0 + uTime * 3.0) * 0.3;
    float midRipple  = uMid  * sin(planeUV.x * 15.0 - uTime * 5.0) * 0.15;
    float highRipple = uHigh * sin(planeUV.x * 25.0 + uTime * 8.0) * 0.08;
    float audioLine = (bassRipple + midRipple + highRipple) * envelope;

    float lineDisp = terrain * 0.7 + breath + audioLine;

    // ════════════════════════════════════════════
    // FIELD STATE (morph = 1): Chladni plate with full audio reactivity
    // ════════════════════════════════════════════
    float animN = uN + sin(uTime*0.3)*0.5;
    float animM = uM + cos(uTime*0.25)*0.5;

    float cVal = chladni(planeUV + vec2(sin(uTime*0.1)*0.05), animN, animM, int(uShapeFn));

    float audioEnergy = uBass * 0.5 + uMid * 0.35 + uHigh * 0.15;

    // Audio-reactive displacement
    float bassDisp  = uBass * sin(planeUV.x * 6.0 + uTime * 2.5) * cos(planeUV.y * 4.0) * 0.2;
    float midDisp   = uMid  * cos(planeUV.y * 10.0 - uTime * 3.0) * sin(planeUV.x * 8.0) * 0.12;
    float highDisp  = uHigh * sin(length(planeUV) * 20.0 + uTime * 6.0) * 0.06;
    float audioDisp = (bassDisp + midDisp + highDisp) * envelope;

    float fieldZ = abs(cVal) * envelope * (1.5 + audioEnergy * 2.0) + audioDisp;
    fieldZ += sin(uTime * 0.5 + r * 3.0) * 0.08 * envelope;

    // ════════════════════════════════════════════
    // MORPH BLEND
    // ════════════════════════════════════════════
    float m = uMorph;
    float flattenY = mix(0.08, 1.0, pow(m, 2.0));

    vec3 pos = position;
    pos.y *= flattenY;

    float lineZ = lineDisp * (1.0 - m);
    float chladZ = fieldZ * m;
    pos.z = (lineZ + chladZ) * uFadeIn;

    vDisp = pos.z;
    vMorph = m;
    vIsField = step(0.5, m);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // ── Point size ──
    float basePtSize = mix(1.5, 2.2, m);
    float audioPtPulse = audioEnergy * mix(0.3, 1.5, m);
    float ptSize = basePtSize + audioPtPulse;

    float nodal = 1.0 - smoothstep(0.0, 0.15, abs(cVal));
    float nodalBoost = nodal * m * (1.0 + uBass * 2.0);
    ptSize += nodalBoost * 1.5;

    gl_PointSize = ptSize * uFadeIn * (6.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const unifiedFragmentShader = /* glsl */ `
  uniform float uMorph;
  uniform float uFadeIn;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uAudioActive;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  varying float vDisp;
  varying float vMorph;
  varying vec2  vFieldUV;
  varying float vIsField;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float softEdge = 1.0 - smoothstep(0.3, 0.5, d);

    // ── Line color: silver/white with displacement brightness ──
    float lineBright = 0.3 + abs(vDisp) * 2.0;
    lineBright = clamp(lineBright, 0.1, 1.0);
    vec3 lineColor = vec3(0.7, 0.72, 0.75) * lineBright;
    float lineAlpha = softEdge * (0.4 + abs(vDisp) * 0.8) * (1.0 - vMorph);

    // ── Field color: mode-specific with audio glow ──
    float audioGlow = uBass * 0.3 + uMid * 0.2;
    float intensity = clamp(abs(vDisp) * 0.8 + audioGlow, 0.05, 1.0);
    vec3 fieldColor = mix(uColor1, uColor2, clamp(vDisp * 0.5 + 0.5, 0.0, 1.0)) * (1.0 + audioGlow * 2.0);
    float fieldAlpha = softEdge * (0.15 + intensity * 0.6 + uMid * 0.3) * vMorph;

    // ── Blend by morph ──
    vec3 color = mix(lineColor, fieldColor, vMorph);
    float alpha = lineAlpha + fieldAlpha;

    // ── Alpha ──
    alpha *= uFadeIn;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Ether background particles
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
