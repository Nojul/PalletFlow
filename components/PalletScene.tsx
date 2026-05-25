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
  highlightedBoxId?: string | null;
  onHoverBox?: (boxId: string | null) => void;
};

const BoxMesh = ({
  box,
  onHover,
  showOutlines,
  offsetY,
  highlightedBoxId,
}: {
  box: PlacedBox;
  onHover: (id: string | null) => void;
  showOutlines: boolean;
  offsetY: number;
  highlightedBoxId?: string | null;
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

  const outlineScale = 1.01; // slightly larger outward offset to reduce edge z-fighting
  const isHighlighted = highlightedBoxId === box.id;
  const shouldShowOutlines = showOutlines || isHighlighted;
  const outlineColor = isHighlighted ? "#f59e0b" : "#ffffff";

  return (
    <group
      position={[
        box.x + box.width / 2,
        offsetY + box.z + box.height / 2,
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

      {shouldShowOutlines && (
        <lineSegments
          geometry={edges}
          scale={[outlineScale, outlineScale, outlineScale]}
        >
          <lineBasicMaterial
            attach="material"
            color={outlineColor}
            linewidth={1}
            depthTest={true}
            depthWrite={true}
            transparent={false}
            opacity={1}
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
  const palletVisualThickness = Math.max(pallet.height * 0.06, 12);
  const palletSlatHeight = palletVisualThickness * 0.28;
  const palletRunnerHeight = palletVisualThickness * 0.45;
  const palletBaseHeight = palletVisualThickness * 0.27;
  const palletSlatCenterY =
    palletBaseHeight + palletRunnerHeight + palletSlatHeight / 2;
  const palletTopSurfaceY =
    palletBaseHeight + palletRunnerHeight + palletSlatHeight;
  const palletRunnerY = palletBaseHeight + palletRunnerHeight / 2;
  const palletBaseY = palletBaseHeight / 2;

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

        <group position={[pallet.width / 2, 0, pallet.depth / 2]}>
          {Array.from({ length: 5 }).map((_, index) => {
            const gap = 1.0;
            const slatDepth = (pallet.depth - gap * 4) / 5;
            return (
              <mesh
                key={`slat-${index}`}
                position={[
                  0,
                  palletSlatCenterY,
                  -pallet.depth / 2 + slatDepth / 2 + index * (slatDepth + gap),
                ]}
              >
                <boxGeometry
                  args={[pallet.width, palletSlatHeight, slatDepth]}
                />
                <meshStandardMaterial
                  color="#8B5E3C"
                  roughness={0.7}
                  metalness={0.1}
                />
              </mesh>
            );
          })}

          {[-1, 0, 1].map((xMul) => (
            <mesh
              key={`runner-${xMul}`}
              position={[xMul * (pallet.width / 3.2), palletRunnerY, 0]}
            >
              <boxGeometry
                args={[pallet.width / 6, palletRunnerHeight, pallet.depth]}
              />
              <meshStandardMaterial
                color="#6B4A2D"
                roughness={0.78}
                metalness={0.05}
              />
            </mesh>
          ))}
        </group>

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
              offsetY={palletTopSurfaceY}
            />
          ))}
      </Canvas>
    </div>
  );
}
