import { BoxTemplate, PalletConfig, PlacedBox } from './types';

const createId = () => Math.random().toString(36).slice(2, 10);

export function getVolume(width: number, depth: number, height: number) {
  return width * depth * height;
}

function collide(a: PlacedBox, b: PlacedBox) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.depth &&
    a.y + a.depth > b.y &&
    a.z < b.z + b.height &&
    a.z + a.height > b.z
  );
}

function fitsInside(pallet: PalletConfig, box: { width: number; depth: number; height: number }, position: { x: number; y: number; z: number }) {
  return (
    position.x + box.width <= pallet.width + 1e-6 &&
    position.y + box.depth <= pallet.depth + 1e-6 &&
    position.z + box.height <= pallet.height + 1e-6
  );
}

export function buildPackingPlan(pallet: PalletConfig, boxes: BoxTemplate[]) {
  const items = boxes.flatMap((template) =>
    Array.from({ length: Math.max(0, template.quantity) }, (_, index) => ({
      id: `${template.id}-${index}`,
      boxId: template.id,
      name: template.name,
      weight: template.weight,
      color: template.color,
      width: template.width,
      depth: template.depth,
      height: template.height,
      volume: getVolume(template.width, template.depth, template.height),
      segments: template.irregularSegments,
    }))
  );

  items.sort((a, b) => b.volume - a.volume || b.height - a.height);

  const placed: PlacedBox[] = [];

  const zPositions = [0];

  const expandPositions = () => {
    const positions = new Set<number>();
    positions.add(0);
    placed.forEach((item) => positions.add(item.z + item.height));
    return Array.from(positions).sort((a, b) => a - b);
  };

  const tryPlace = (item: typeof items[number]) => {
    const heightVariants: Array<{ width: number; depth: number; rotation: 0 | 90 }> = [
      { width: item.width, depth: item.depth, rotation: 0 },
      { width: item.depth, depth: item.width, rotation: 90 },
    ];

    const zCandidates = expandPositions();

    for (const z of zCandidates) {
      for (const variant of heightVariants) {
        for (let x = 0; x <= pallet.width - variant.width; x += 2) {
          for (let y = 0; y <= pallet.depth - variant.depth; y += 2) {
            const candidate = {
              id: createId(),
              boxId: item.boxId,
              name: item.name,
              width: variant.width,
              depth: variant.depth,
              height: item.height,
              weight: item.weight,
              color: item.color,
              x,
              y,
              z,
              rotation: variant.rotation,
              layer: z === 0 ? 0 : z,
            };
            if (!fitsInside(pallet, candidate, candidate)) continue;
            const collisions = placed.some((placedItem) => collide(candidate, placedItem));
            if (!collisions) {
              placed.push(candidate);
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  items.forEach((item) => tryPlace(item));

  return placed;
}

export function summarizePacking(pallet: PalletConfig, placed: PlacedBox[]) {
  const totalVolume = pallet.width * pallet.depth * pallet.height;
  const usedVolume = placed.reduce((sum, box) => sum + box.width * box.depth * box.height, 0);
  const totalWeight = placed.reduce((sum, box) => sum + box.weight, 0);
  const maxHeight = placed.reduce((current, box) => Math.max(current, box.z + box.height), 0);
  const utilization = totalVolume ? Math.min(100, (usedVolume / totalVolume) * 100) : 0;
  const heightUsage = pallet.height ? Math.min(100, (maxHeight / pallet.height) * 100) : 0;
  const efficiency = totalWeight && totalVolume ? Math.round((utilization * 0.7 + heightUsage * 0.2 + Math.min(100, (usedVolume / totalVolume) * 100) * 0.1)) : utilization;

  return {
    totalVolume,
    usedVolume,
    totalWeight,
    maxHeight,
    utilization,
    heightUsage,
    efficiency,
  };
}
