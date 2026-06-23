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
      } catch (e) {}
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
  const boardHeight = palletVisualThickness * 0.32;
  const blockHeight = palletVisualThickness * 0.58;
  const gap = 1.5;

  // Vertical stacking: bottom → blocks → top
  const bottomPlanksY = boardHeight / 2;
  const blockY = boardHeight + blockHeight / 2;
  const topBoardY = boardHeight + blockHeight + boardHeight / 2;
  const palletTopSurfaceY = boardHeight + blockHeight + boardHeight;

  // Material definitions for layer debugging (temporary colors)
  const topMaterial = {
    color: "#8B5E3C", // Light honey wood
    roughness: 0.75,
    metalness: 0.05,
  };

  const blockMaterial = {
    color: "#6B4A2D",
    roughness: 0.75,
    metalness: 0.05,
  };

  const bottomMaterial = {
    color: "#6B4A2D", // Darker brown
    roughness: 0.75,
    metalness: 0.05,
  };

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
          {/* TOP BOARDS: 5 boards running across width */}
          {Array.from({ length: 5 }).map((_, index) => {
            const boardDepth = (pallet.depth - gap * 4) / 5;
            const zPos =
              -pallet.depth / 2 + boardDepth / 2 + index * (boardDepth + gap);
            return (
              <mesh key={`top-${index}`} position={[0, topBoardY, zPos]}>
                <boxGeometry args={[pallet.width, boardHeight, boardDepth]} />
                <meshStandardMaterial {...topMaterial} />
              </mesh>
            );
          })}

          {/* SUPPORT BLOCKS: 3×3 grid (9 blocks total) - flush with edges */}
          {Array.from({ length: 3 }).map((_, xi) =>
            Array.from({ length: 3 }).map((_, zi) => {
              const blockSize = Math.min(pallet.width, pallet.depth) * 0.14;

              // Calculate positions so outer blocks are flush with pallet edges
              let xPos;
              if (xi === 0) xPos = -pallet.width / 2 + blockSize / 2;
              else if (xi === 2) xPos = pallet.width / 2 - blockSize / 2;
              else xPos = 0;

              let zPos;
              if (zi === 0) zPos = -pallet.depth / 2 + blockSize / 2;
              else if (zi === 2) zPos = pallet.depth / 2 - blockSize / 2;
              else zPos = 0;

              return (
                <mesh
                  key={`support-block-${xi}-${zi}`}
                  position={[xPos, blockY, zPos]}
                >
                  <boxGeometry args={[blockSize, blockHeight, blockSize]} />
                  <meshStandardMaterial {...blockMaterial} />
                </mesh>
              );
            }),
          )}

          {/* BOTTOM LAYER: 3 planks positioned under the 3 block rows */}
          {Array.from({ length: 3 }).map((_, zi) => {
            const blockSize = Math.min(pallet.width, pallet.depth) * 0.14;
            const boardDepth = blockSize;

            // Match the Z positions of block rows
            let zPos;
            if (zi === 0) zPos = -pallet.depth / 2 + blockSize / 2;
            else if (zi === 2) zPos = pallet.depth / 2 - blockSize / 2;
            else zPos = 0;

            return (
              <mesh key={`bottom-${zi}`} position={[0, bottomPlanksY, zPos]}>
                <boxGeometry args={[pallet.width, boardHeight, boardDepth]} />
                <meshStandardMaterial {...bottomMaterial} />
              </mesh>
            );
          })}
        </group>

        {/* PACKED BOXES ON TOP */}
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
