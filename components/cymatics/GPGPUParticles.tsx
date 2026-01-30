"use client";

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFBO } from '@react-three/drei';
import { simulationFragmentShader, simulationVertexShader } from '@/shaders/gpgpu/simulation';
import { renderVertexShader, renderFragmentShader } from '@/shaders/gpgpu/render';
import { useAudio } from '@/components/AudioProvider';

// Simplex noise function for shader injection
const simplexNoise = `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

interface GPGPUParticlesProps {
  count?: number; // Size of texture side (total particles = count * count)
  size?: number;  // Particle render size
  color1?: [number, number, number];
  color2?: [number, number, number];
}

export const GPGPUParticles = ({ 
  count = 128, 
  size = 1.5,
  color1 = [0.1, 0.3, 0.8],
  color2 = [1.0, 0.8, 0.4]
}: GPGPUParticlesProps) => {
  const { gl, camera } = useThree();
  const { getFrequencyData } = useAudio();
  
  // Total particles = count * count
  const particleCount = count * count;

  // 1. Initial Data Generation
  // Create initial position data for the texture
  const initialData = useMemo(() => {
    const data = new Float32Array(particleCount * 4);
    for (let i = 0; i < particleCount; i++) {
      const i4 = i * 4;
      // Random positions in a sphere
      const r = 5 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      data[i4] = r * Math.sin(phi) * Math.cos(theta); // x
      data[i4 + 1] = r * Math.sin(phi) * Math.sin(theta); // y
      data[i4 + 2] = r * Math.cos(phi); // z
      data[i4 + 3] = Math.random(); // w (life/phase)
    }
    return data;
  }, [particleCount]);

  // Create texture from initial data
  const initialTexture = useMemo(() => {
    const tex = new THREE.DataTexture(
      initialData,
      count,
      count,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    tex.needsUpdate = true;
    return tex;
  }, [initialData, count]);

  // 2. FBO Setup (Ping-Pong)
  // We need two targets to swap between reading (previous frame) and writing (current frame)
  const renderTargetA = useFBO(count, count, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType, // Critical for precision
    stencilBuffer: false,
    depthBuffer: false,
  });

  const renderTargetB = useFBO(count, count, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    stencilBuffer: false,
    depthBuffer: false,
  });

  // 3. Simulation Material
  // This shader runs on the GPU to calculate new positions
  const simMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: initialTexture },
        uTime: { value: 0 },
        uDelta: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: simplexNoise + simulationFragmentShader,
    });
  }, [initialTexture]);

  // 4. Render Material
  // This shader renders the actual points using positions from the FBO
  const renderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: null }, // Will be updated in loop
        uSize: { value: size },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uColor1: { value: new THREE.Vector3(...color1) },
        uColor2: { value: new THREE.Vector3(...color2) },
      },
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [size, color1, color2]);

  // 5. Geometry
  // We need a buffer with UVs pointing to each texel in the FBO
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3); // Dummy positions
    const uvs = new Float32Array(particleCount * 2); // UVs to lookup texture

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const index = i * count + j;
        uvs[index * 2] = j / (count - 1);
        uvs[index * 2 + 1] = i / (count - 1);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geo;
  }, [particleCount, count]);

  // 6. Simulation Loop
  // Scene for simulation pass (just a fullscreen quad)
  const simScene = useMemo(() => new THREE.Scene(), []);
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const simQuad = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    return mesh;
  }, [simMaterial]);

  useEffect(() => {
    simScene.add(simQuad);
    return () => { simScene.remove(simQuad); };
  }, [simScene, simQuad]);

  // Ref to track current FBO (A or B)
  const currentTargetIndex = useRef(0);

  useFrame((state, delta) => {
    const { bass, mid, high } = getFrequencyData();
    const time = state.clock.elapsedTime;

    // 1. Simulation Pass
    // Swap targets
    const readTarget = currentTargetIndex.current === 0 ? renderTargetA : renderTargetB;
    const writeTarget = currentTargetIndex.current === 0 ? renderTargetB : renderTargetA;
    currentTargetIndex.current = 1 - currentTargetIndex.current;

    // Update simulation uniforms
    simMaterial.uniforms.uPositions.value = readTarget.texture;
    simMaterial.uniforms.uTime.value = time;
    simMaterial.uniforms.uDelta.value = delta;
    simMaterial.uniforms.uBass.value = bass;
    simMaterial.uniforms.uMid.value = mid;
    simMaterial.uniforms.uHigh.value = high;

    // Render new positions to writeTarget
    gl.setRenderTarget(writeTarget);
    gl.render(simScene, simCamera);
    gl.setRenderTarget(null); // Reset to default framebuffer

    // 2. Render Pass (Particles)
    // Update render material to read from the target we just wrote to
    renderMaterial.uniforms.uPositions.value = writeTarget.texture;
    renderMaterial.uniforms.uTime.value = time;
    renderMaterial.uniforms.uBass.value = bass;
    renderMaterial.uniforms.uMid.value = mid;
    renderMaterial.uniforms.uColor1.value.set(...color1);
    renderMaterial.uniforms.uColor2.value.set(...color2);
  });

  return (
    <points geometry={geometry} material={renderMaterial} />
  );
};
