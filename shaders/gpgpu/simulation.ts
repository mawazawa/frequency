// ═══════════════════════════════════════════════════════════════════
// GPGPU Simulation Shader
// Calculates particle positions based on audio data and physics
// ═══════════════════════════════════════════════════════════════════

export const simulationFragmentShader = /* glsl */ `
  uniform sampler2D uPositions;
  uniform float uTime;
  uniform float uDelta;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uAttraction; // 0 = random flow, 1 = form shape
  uniform sampler2D uTargetShape; // Texture defining target positions
  
  // Curl noise for fluid motion
  vec3 snoiseVec3( vec3 x ){
    float s  =  snoise(vec3( x ));
    float s1 =  snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
    float s2 =  snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
    vec3 c = vec3( s , s1 , s2 );
    return c;
  }

  vec3 curlNoise( vec3 p ){
    const float e = .1;
    vec3 dx = vec3( e   , 0.0 , 0.0 );
    vec3 dy = vec3( 0.0 , e   , 0.0 );
    vec3 dz = vec3( 0.0 , 0.0 , e   );

    vec3 p_x0 = snoiseVec3( p - dx );
    vec3 p_x1 = snoiseVec3( p + dx );
    vec3 p_y0 = snoiseVec3( p - dy );
    vec3 p_y1 = snoiseVec3( p + dy );
    vec3 p_z0 = snoiseVec3( p - dz );
    vec3 p_z1 = snoiseVec3( p + dz );

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / ( 2.0 * e );
    return normalize( vec3( x , y , z ) * divisor );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 currentPos = texture2D(uPositions, uv);
    vec3 pos = currentPos.rgb;
    float life = currentPos.a; // Use alpha channel for particle life/phase

    // 1. Fluid Motion (Curl Noise)
    // Audio affects turbulence speed and scale
    float noiseScale = 0.5 + uBass * 0.5;
    float speed = 0.1 + uMid * 0.8;
    
    vec3 velocity = curlNoise(pos * noiseScale + uTime * 0.1) * speed * uDelta;
    
    // 2. Audio Reactivity - Expansion
    // Bass pushes particles outward
    vec3 center = vec3(0.0, 0.0, 0.0);
    vec3 dir = normalize(pos - center);
    velocity += dir * uBass * 0.05 * uDelta;

    // 3. Apply Velocity
    pos += velocity;

    // 4. Bounds Check / Reset
    // Keep particles within a reasonable box
    if (length(pos) > 12.0) {
        pos = normalize(pos) * 1.0; // Reset to center-ish
    }
    
    // Write new position
    gl_FragColor = vec4(pos, life);
  }
`;

export const simulationVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
