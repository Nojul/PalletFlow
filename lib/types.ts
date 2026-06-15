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

export type BoxPreset = Omit<
  BoxTemplate,
  "color" | "irregularSegments" | "quantity"
>;

export type PlacedBox = {
  id: string;
  boxId: string;
  name: string;
  originalWidth: number;
  originalDepth: number;
  originalHeight: number;
  width: number;
  depth: number;
  height: number;
  weight: number;
  color: string;
  x: number;
  y: number;
  z: number;
  rotationX: 0 | 90;
  rotationY: 0 | 90;
  layer: number;
  visibleSides?: {
    left: boolean;
    right: boolean;
    front: boolean;
    back: boolean;
  };
  sideVisible?: boolean;
  topVisible?: boolean;
  visibilityStatus?: "side-visible" | "top-only" | "hidden";
  scannable?: boolean;
  invalid?: boolean;
};

export type PalletConfig = {
  width: number;
  depth: number;
  height: number;
  maxWeight: number;
  unit: 'cm' | 'in';
};
