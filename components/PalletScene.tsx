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
  const geom = React.useMemo(
    () => new THREE.BoxGeometry(box.width, box.height, box.depth),
    [box.width, box.height, box.depth],
  );
  const edges = React.useMemo(() => new THREE.EdgesGeometry(geom), [geom]);

  React.useEffect(() => {
    return () => {
      edges.dispose();
      geom.dispose();
    };
  }, [edges, geom]);

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
      rotation={[0, 0, 0]}
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
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {shouldShowOutlines && (
        <lineSegments geometry={edges} renderOrder={10}>
          <lineBasicMaterial
            attach="material"
            color={outlineColor}
            linewidth={2}
            depthTest={true}
            depthWrite={false}
            transparent
            opacity={0.95}
            toneMapped={false}
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

  const bottomPlanksY = boardHeight / 2;
  const blockY = boardHeight + blockHeight / 2;
  const topBoardY = boardHeight + blockHeight + boardHeight / 2;
  const palletTopSurfaceY = boardHeight + blockHeight + boardHeight;

  const topMaterial = {
    color: "#8B5E3C",
    roughness: 0.75,
    metalness: 0.05,
  };

  const blockMaterial = {
    color: "#6B4A2D",
    roughness: 0.75,
    metalness: 0.05,
  };

  const bottomMaterial = {
    color: "#6B4A2D",
    roughness: 0.75,
    metalness: 0.05,
  };

  const palletSize = Math.sqrt(pallet.width ** 2 + pallet.depth ** 2);

  return (
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/80 shadow-soft">
      <Canvas
        camera={{
          position: [palletSize * 1.2, palletSize * 0.9, palletSize * 1.6],
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
          maxDistance={palletSize * 5}
          minPolarAngle={0.25 * Math.PI}
          maxPolarAngle={1.35 * Math.PI}
        />

        <group position={[pallet.width / 2, 0, pallet.depth / 2]}>
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

          {Array.from({ length: 3 }).map((_, xi) =>
            Array.from({ length: 3 }).map((_, zi) => {
              const blockSize = Math.min(pallet.width, pallet.depth) * 0.14;
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

          {Array.from({ length: 3 }).map((_, zi) => {
            const blockSize = Math.min(pallet.width, pallet.depth) * 0.14;
            const boardDepth = blockSize;
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
