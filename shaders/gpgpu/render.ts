// ═══════════════════════════════════════════════════════════════════
// Particle Render Shader
// Renders the particles based on positions from the GPGPU texture
// ═══════════════════════════════════════════════════════════════════

export const renderVertexShader = /* glsl */ `
  uniform sampler2D uPositions; // Position texture from GPGPU
  uniform float uSize;
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  
  varying vec3 vPos;
  varying float vDist;

  void main() {
    // Read position from GPGPU texture
    vec4 posData = texture2D(uPositions, uv);
    vec3 pos = posData.rgb;
    vPos = pos;
    
    // Standard view transform
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Dynamic size based on depth and audio
    float audioScale = 1.0 + uBass * 2.0;
    gl_PointSize = uSize * audioScale * (10.0 / -mvPosition.z);

    vDist = length(pos);
  }
`;

export const renderFragmentShader = /* glsl */ `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  
  varying vec3 vPos;
  varying float vDist;

  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    // Soft edge
    float alpha = 1.0 - smoothstep(0.3, 0.5, r);
    
    // Color gradient based on distance from center
    vec3 color = mix(uColor1, uColor2, clamp(vDist/12.0, 0.0, 1.0));
    
    gl_FragColor = vec4(color, alpha * 0.8);
  }
`;
