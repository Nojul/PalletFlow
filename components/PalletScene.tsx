"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { PlacedBox, PalletConfig } from "@/lib/types";

type Props = {
  pallet: PalletConfig;
  boxes: PlacedBox[];
  activeLayer: number | "all";
  showOnlyScannable?: boolean;
  showBoxOutlines?: boolean;
  onHoverBox?: (boxId: string | null) => void;
};

const BoxMesh = ({
  box,
  onHover,
  showOutlines,
}: {
  box: PlacedBox;
  onHover: (id: string | null) => void;
  showOutlines: boolean;
}) => {
  // cache a box geometry and its edges so we don't recreate per-frame
  const geom = React.useMemo(
    () =>
      new THREE.BoxGeometry(
        box.originalWidth,
        box.originalHeight,
        box.originalDepth,
      ),
    [box.originalWidth, box.originalHeight, box.originalDepth],
  );
  const edges = React.useMemo(() => new THREE.EdgesGeometry(geom), [geom]);

  React.useEffect(() => {
    return () => {
      try {
        edges.dispose();
        geom.dispose();
      } catch (e) {
        /* ignore dispose errors */
      }
    };
  }, [edges, geom]);

  const outlineScale = 1.0005; // tiny outward offset to avoid z-fighting

  return (
    <group
      position={[
        box.x + box.width / 2,
        box.z + box.height / 2,
        box.y + box.depth / 2,
      ]}
      rotation={[
        (box.rotationX * Math.PI) / 180,
        (box.rotationY * Math.PI) / 180,
        0,
      ]}
    >
      <mesh
        geometry={geom}
        onPointerOver={() => onHover(box.id)}
        onPointerOut={() => onHover(null)}
        renderOrder={0}
      >
        <meshStandardMaterial
          attach="material"
          color={
            box.invalid
              ? "#f87171"
              : box.visibilityStatus === "top-only"
                ? "#f59e0b"
                : box.color
          }
          roughness={0.35}
          metalness={0.2}
          opacity={0.95}
          transparent
        />
      </mesh>

      {showOutlines && (
        <lineSegments
          geometry={edges}
          renderOrder={1}
          scale={[outlineScale, outlineScale, outlineScale]}
        >
          <lineBasicMaterial
            attach="material"
            color="#000000"
            transparent
            opacity={0.95}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={1}
          />
        </lineSegments>
      )}
    </group>
  );
};

export function PalletScene({
  pallet,
  boxes,
  activeLayer,
  showOnlyScannable,
  showBoxOutlines,
  onHoverBox,
}: Props) {
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
          minDistance={Math.max(
            20,
            Math.min(pallet.width, pallet.depth) * 0.75,
          )}
          maxDistance={Math.max(pallet.width, pallet.depth) * 3.5}
          minPolarAngle={0.25 * Math.PI}
          maxPolarAngle={1.35 * Math.PI}
        />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[pallet.width / 2, 0, pallet.depth / 2]}
        />

        <mesh position={[pallet.width / 2, -2.5, pallet.depth / 2]}>
          <boxGeometry args={[pallet.width + 4, 5, pallet.depth + 4]} />
          <meshStandardMaterial color="#C08A4B" />
        </mesh>

        {boxes
          .filter(
            (box) =>
              (activeLayer === "all" || box.layer === activeLayer) &&
              (!showOnlyScannable || box.sideVisible),
          )
          .map((box) => (
            <BoxMesh
              key={box.id}
              box={box}
              showOutlines={showBoxOutlines ?? false}
              onHover={onHoverBox ?? (() => null)}
            />
          ))}
      </Canvas>
    </div>
  );
}
