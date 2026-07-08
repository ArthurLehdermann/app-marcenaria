export type Millimeters = number;
export type UUID = string;

// Domínio aceita qualquer espessura positiva. O combo da UI é fixo.
export type Thickness = Millimeters;
export const THICKNESS_OPTIONS: Thickness[] = [6, 9, 15, 18, 25];

export type EdgeSide = "top" | "bottom" | "left" | "right";

export type Vec3 = {
  x: Millimeters;
  y: Millimeters;
  z: Millimeters;
};

export type Box = { min: Vec3; max: Vec3 };

// Qual eixo local do painel aponta para cima.
// "y" em pe (padrao). "x" girado no plano. "z" deitado.
// O usuario nunca ve isto. A UI mostra Em pe / Deitado / Fundo.
export type UpAxis = "x" | "y" | "z";

export type Panel = {
  id: UUID;
  type: string;
  name: string;
  width: Millimeters;
  height: Millimeters;
  thickness: Thickness;
  position: Vec3;
  upAxis: UpAxis;
  edges: Record<EdgeSide, boolean>;
  color: string;
  visible: boolean;
};

export type ProjectSettings = {
  defaultMaterial: string;
  defaultThickness: Thickness;
};

export type Project = {
  id: UUID;
  name: string;
  settings: ProjectSettings;
  panels: Panel[];
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  schemaVersion: 1;
};

// Estado da sessao. Nunca persiste no arquivo do projeto.
export type EditorState = {
  selectedPanelId?: UUID;
  hoveredPanelId?: UUID;
  showCollisions: boolean;
  camera: { position: Vec3; target: Vec3 };
};
