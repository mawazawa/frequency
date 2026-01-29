"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";

export default function DebugPage() {
  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-white mb-4">Debug Page: If you see the spinning box, R3F is working.</h1>
      <div className="h-[500px] w-full border border-white/20">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Box args={[1, 1, 1]} rotation={[0.5, 0.5, 0]}>
            <meshStandardMaterial color="hotpink" />
          </Box>
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}
