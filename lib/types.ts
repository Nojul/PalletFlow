export type BoxTemplate = {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  weight: number;
  quantity: number;
  color: string;
  irregularSegments?: Array<{ x: number; y: number; z: number; width: number; depth: number; height: number }>;
};

export type PlacedBox = {
  id: string;
  boxId: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  weight: number;
  color: string;
  x: number;
  y: number;
  z: number;
  rotation: 0 | 90;
  layer: number;
};

export type PalletConfig = {
  width: number;
  depth: number;
  height: number;
  maxWeight: number;
  unit: 'cm' | 'in';
};
