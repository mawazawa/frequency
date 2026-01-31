export const titleVertex = `
  varying vec2 vUv;
  uniform float uBend;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Parabolic Bend (Universal Studios style)
    // Bends the sides back (negative Z) based on distance from center X
    float xDist = pos.x; // Assumes mesh is centered
    pos.z -= pow(xDist * 0.5, 2.0) * uBend;
    
    // Slight Tilt back to face camera
    // pos.y += pow(abs(xDist), 2.0) * 0.1; 

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const titleFragment = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  
  // --- Simplex 2D Noise (Standard Ashima) ---
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Sample the text texture (White text on transparent background)
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Discard transparent pixels
    if (texColor.a < 0.1) discard;
    
    // --- SHIMMER LOGIC ---
    // High-frequency noise for "grain"
    float grain = snoise(vUv * 50.0 + uTime * 2.0);
    
    // Moving light bar (The sweep)
    float sweep = sin(vUv.x * 3.0 - uTime * 1.5 + vUv.y); // Diagonal sweep
    sweep = smoothstep(0.8, 0.95, sweep); // Sharpen the band
    
    // Combine Grain + Sweep
    float shimmer = sweep * (0.5 + 0.5 * grain);
    
    // Base Material: Metallic (Dark Grey to White)
    vec3 baseCol = vec3(0.1); // Dark metal
    vec3 highlight = vec3(1.0); // White shimmer
    
    vec3 finalCol = mix(baseCol, highlight, shimmer);
    
    // Apply stroke effect (Distance field approximation or edge detection if possible, 
    // but with standard texture we just use the alpha)
    
    gl_FragColor = vec4(finalCol, uOpacity * texColor.a);
  }
`;
