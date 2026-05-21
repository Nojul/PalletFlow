"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PlacedBox, PalletConfig } from "@/lib/types";

type Props = {
  pallet: PalletConfig;
  boxes: PlacedBox[];
  activeLayer: number | "all";
  onHoverBox?: (boxId: string | null) => void;
};

const BoxMesh = ({
  box,
  onHover,
}: {
  box: PlacedBox;
  onHover: (id: string | null) => void;
}) => (
  <mesh
    position={[
      box.x + box.width / 2,
      box.z + box.height / 2,
      box.y + box.depth / 2,
    ]}
    onPointerOver={() => onHover(box.id)}
    onPointerOut={() => onHover(null)}
  >
    <boxGeometry args={[box.width, box.height, box.depth]} />
    <meshStandardMaterial
      color={box.color}
      roughness={0.35}
      metalness={0.2}
      opacity={0.9}
      transparent
    />
  </mesh>
);

export function PalletScene({ pallet, boxes, activeLayer, onHoverBox }: Props) {
  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/80 shadow-soft">
      <Canvas
        camera={{
          position: [
            pallet.width * 1.2,
            pallet.height * 0.75,
            pallet.depth * 1.4,
          ],
          fov: 42,
        }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[30, 50, 20]} intensity={1.1} />
        <directionalLight position={[-20, 10, -20]} intensity={0.5} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          target={[pallet.width / 2, pallet.height / 4, pallet.depth / 2]}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[pallet.width / 2, 0, pallet.depth / 2]}
        >
          <planeGeometry args={[pallet.width, pallet.depth]} />
          <meshStandardMaterial color="#1e293b" opacity={0.88} transparent />
        </mesh>
        <mesh position={[pallet.width / 2, -2.5, pallet.depth / 2]}>
          <boxGeometry args={[pallet.width + 4, 5, pallet.depth + 4]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {boxes
          .filter((box) => box.layer === activeLayer || activeLayer === "all")
          .map((box) => (
            <BoxMesh
              key={box.id}
              box={box}
              onHover={onHoverBox ?? (() => null)}
            />
          ))}
      </Canvas>
    </div>
  );
}
