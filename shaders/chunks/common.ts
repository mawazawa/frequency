export const noiseFunctions = /* glsl */ `
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
`;

export const chladniFunctions = /* glsl */ `
  // ── Chladni pattern ──
  float chladni(vec2 p, float n, float m, float a, float b) {
    float PI = 3.14159265;
    return a*sin(PI*n*p.x)*sin(PI*m*p.y) + b*sin(PI*m*p.x)*sin(PI*n*p.y);
  }
`;

export const shapeFunctions = /* glsl */ `
  // ── Shape envelope (tapers edges for organic form) ──
  float getEnvelope(vec2 pos) {
    float edgeFadeX = 1.0 - pow(abs(pos.x), 2.4);
    float edgeFadeY = 1.0 - pow(abs(pos.y), 2.0);
    return edgeFadeX * edgeFadeY;
  }
`;
