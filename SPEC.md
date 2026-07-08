# Motor de Marcenaria — Spec do Core V1

**spec-v1.0 — CONGELADA.** Sem alterações estruturais até o primeiro MVP rodar. Tag no Git antes de codar.

Regra de disciplina: nenhuma funcionalidade nova entra na V1 sem remover outra de complexidade equivalente.

Critério de escopo: se não for necessário para pedir MDF cortado e fitado na próxima semana, fica para V2.

Sem veio. Sem nesting. Sem IA. Sem receitas. Sem persistência em servidor.

---

## 1. Decisões travadas

- Material definido nas configurações do projeto. Peça herda. Sem escolha por peça na V1.
- Espessura: combo fixo. 6, 9, 15, 18, 25 mm. Opção "Outra" adiada.
- Painel é uma caixa. Três dimensões e uma posição no espaço.
- Rotação: 90 graus em eixo único. Sem rotação livre.
- Dimensão no pedido: largura x altura. Sem convenção de veio.
- Colisão: tolerância de 0.5 mm. Encosto não gera alerta.
- Persistência: exportar e importar JSON como arquivo. Sem LocalStorage como fonte única.
- Fita por lado do painel: 4 lados.
- Agrupamento não normaliza dimensões. 720x560 e 560x720 geram linhas separadas. Custo: linha duplicada no pedido. Benefício: fita nunca migra de lado. Normalização com rotação de fitas entra na V2 junto com veio.
- `visible` é só visual. Ocultar não é excluir. Peça oculta entra no pedido, na lista de peças e na colisão normalmente.
- Pedido agrupado por espessura. Chapa de 6 e de 18 são compras separadas.
- `defaultMaterial` é só rótulo de texto pro pedido. Não afeta desenho, colisão nem corte. Sem `MaterialDefinition`, preço ou fabricante na V1.
- `Thickness` é `number` no domínio, validado como positivo. Combo fixo é só UI. Combo é UI, tipo é domínio.
- `EditorState` separado de `Project`. Seleção, hover, câmera e flags de UI nunca entram no arquivo salvo.
- Render on demand. Sem loop de render contínuo.

---

## 2. Sistema de coordenadas

- Unidade interna: milímetro. Number.
- Eixos: X largura, Y altura, Z profundidade.
- Origem do painel: canto inferior traseiro esquerdo.
- Position: canto do painel no espaço do projeto.

Painel é sempre axis-aligned. Rotação de 90 graus troca eixos, não gera ângulo arbitrário. Isso mantém colisão como comparação de caixas (AABB) e dispensa matemática de orientação.

---

## 3. Tipos do core

```typescript
type Millimeters = number;
type UUID = string;

// Domínio aceita qualquer espessura positiva. O combo da UI é fixo.
type Thickness = Millimeters;

const THICKNESS_OPTIONS: Thickness[] = [6, 9, 15, 18, 25]; // só UI

type EdgeSide = "top" | "bottom" | "left" | "right";

type Vec3 = {
  x: Millimeters;
  y: Millimeters;
  z: Millimeters;
};

// Rotação restrita: qual eixo do painel aponta para cima.
// "y" = painel em pé (padrão). "x" = deitado no eixo X. "z" = deitado no eixo Z.
// O usuário nunca vê isto. A UI mostra apenas "Girar 90°".
type UpAxis = "x" | "y" | "z";

type Panel = {
  id: UUID;
  type: string;         // categoria: "Lateral", "Base", "Prateleira"
  name: string;         // rótulo: "Lateral esquerda"
  width: Millimeters;   // dimensão local X
  height: Millimeters;  // dimensão local Y
  thickness: Thickness; // dimensão local Z
  position: Vec3;       // canto inferior traseiro esquerdo no projeto
  upAxis: UpAxis;       // rotação 90 graus em eixo único
  edges: Record<EdgeSide, boolean>; // fita por lado
  color: string;        // hex, só visual
  visible: boolean;     // esconder durante o projeto
};

type ProjectSettings = {
  defaultMaterial: string;   // rótulo pro pedido, ex: "MDF Ultra 18 mm"
  defaultThickness: Thickness;
};

type Project = {
  id: UUID;
  name: string;
  settings: ProjectSettings;
  panels: Panel[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  appVersion: string;   // ex: "0.1.0"
  schemaVersion: 1;
};

// Estado da sessão. NUNCA persiste no arquivo do projeto.
type EditorState = {
  selectedPanelId?: UUID;
  hoveredPanelId?: UUID;
  showCollisions: boolean;
  camera: { position: Vec3; target: Vec3 };
};
```

`Project` é o que persiste. `EditorState` é efêmero. Documento e sessão são coisas separadas. `Project` não conhece `EditorState`, `EditorState` não conhece o pedido.

`schemaVersion` existe desde a V1. Quando o veio entrar na V2, migração lê a versão e completa campos ausentes.

---

## 4. Bounding box efetivo

A caixa ocupada no espaço depende do `upAxis`. Função pura:

```typescript
type Box = { min: Vec3; max: Vec3 };

function panelBox(p: Panel): Box {
  // dimensões locais
  const dx = p.width;
  const dy = p.height;
  const dz = p.thickness;

  // mapeia local -> mundo conforme upAxis
  let sx: Millimeters, sy: Millimeters, sz: Millimeters;
  switch (p.upAxis) {
    case "y": sx = dx; sy = dy; sz = dz; break; // em pé
    case "x": sx = dy; sy = dx; sz = dz; break; // girado no plano XY
    case "z": sx = dx; sy = dz; sz = dy; break; // deitado
  }

  return {
    min: { x: p.position.x, y: p.position.y, z: p.position.z },
    max: { x: p.position.x + sx, y: p.position.y + sy, z: p.position.z + sz },
  };
}
```

O renderer Three.js consome `panelBox` também. Uma fonte de verdade para posição e tamanho.

---

## 5. Detecção de colisão

```typescript
const COLLISION_TOLERANCE: Millimeters = 0.5;

function overlap1D(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

function collides(a: Panel, b: Panel): boolean {
  const ba = panelBox(a);
  const bb = panelBox(b);

  const ox = overlap1D(ba.min.x, ba.max.x, bb.min.x, bb.max.x);
  const oy = overlap1D(ba.min.y, ba.max.y, bb.min.y, bb.max.y);
  const oz = overlap1D(ba.min.z, ba.max.z, bb.min.z, bb.max.z);

  // colisão real: sobreposição acima da tolerância nos três eixos
  return ox > COLLISION_TOLERANCE
      && oy > COLLISION_TOLERANCE
      && oz > COLLISION_TOLERANCE;
}

type Collision = { a: UUID; b: UUID };

function findCollisions(panels: Panel[]): Collision[] {
  const out: Collision[] = [];
  for (let i = 0; i < panels.length; i++) {
    for (let j = i + 1; j < panels.length; j++) {
      if (collides(panels[i], panels[j])) {
        out.push({ a: panels[i].id, b: panels[j].id });
      }
    }
  }
  return out;
}
```

Encosto perfeito produz overlap igual a 0 em um eixo. Fica abaixo da tolerância. Não alerta. Resolve o falso positivo do encaixe.

O(n²) é aceitável. Projeto de móvel tem dezenas de painéis, não milhares.

---

## 6. Lista de peças e agrupamento

Peças idênticas agrupam. Idêntico = mesmas dimensões de corte e mesma configuração de fita.

Dimensão de corte é sempre largura x altura do painel, independente de `upAxis`. O corte é da chapa plana, antes de posicionar.

```typescript
type CutPiece = {
  width: Millimeters;
  height: Millimeters;
  thickness: Thickness;
  edges: Record<EdgeSide, boolean>;
};

type GroupedPiece = CutPiece & { qty: number; names: string[] };

function edgeKey(e: Record<EdgeSide, boolean>): string {
  return `${+e.top}${+e.bottom}${+e.left}${+e.right}`;
}

function groupPieces(panels: Panel[]): GroupedPiece[] {
  const map = new Map<string, GroupedPiece>();
  for (const p of panels) {
    const key = `${p.width}x${p.height}x${p.thickness}-${edgeKey(p.edges)}`;
    const found = map.get(key);
    if (found) {
      found.qty += 1;
      found.names.push(p.name);
    } else {
      map.set(key, {
        width: p.width,
        height: p.height,
        thickness: p.thickness,
        edges: { ...p.edges },
        qty: 1,
        names: [p.name],
      });
    }
  }
  return [...map.values()];
}

function areaByThicknessM2(panels: Panel[]): Map<Thickness, number> {
  const out = new Map<Thickness, number>();
  for (const p of panels) {
    const prev = out.get(p.thickness) ?? 0;
    out.set(p.thickness, prev + (p.width * p.height) / 1_000_000);
  }
  return out;
}
```

Sem área total única. Cada espessura é uma compra de chapa distinta.

---

## 7. Formato do pedido

Três saídas do mesmo dado agrupado: texto WhatsApp, CSV, PDF. O core produz o texto e o CSV. PDF é camada de UI.

### 7.1 WhatsApp (texto)

```typescript
function edgeLabels(e: Record<EdgeSide, boolean>): string {
  const map: Record<EdgeSide, string> = {
    top: "Superior", bottom: "Inferior", left: "Esquerda", right: "Direita",
  };
  const on = (Object.keys(map) as EdgeSide[]).filter(k => e[k]).map(k => map[k]);
  return on.length ? on.join(", ") : "sem fita";
}

function buildWhatsappOrder(project: Project): string {
  const groups = groupPieces(project.panels);
  const byThickness = new Map<Thickness, GroupedPiece[]>();
  for (const g of groups) {
    const arr = byThickness.get(g.thickness) ?? [];
    arr.push(g);
    byThickness.set(g.thickness, arr);
  }

  const area = areaByThicknessM2(project.panels);
  const lines: string[] = [];
  lines.push("Bom dia. Orcamento para corte e fita:");
  lines.push("");

  const base = project.settings.defaultMaterial.replace(/\s*\d+\s*mm\s*$/i, "");
  const thicknesses = [...byThickness.keys()].sort((a, b) => a - b);

  for (const t of thicknesses) {
    lines.push(`${base} ${t} mm`);
    for (const g of byThickness.get(t)!) {
      lines.push(`${g.qty}x ${g.width} x ${g.height} mm`);
      lines.push(`Fita: ${edgeLabels(g.edges)}`);
      lines.push(`(${g.names.join("; ")})`);
    }
    lines.push(`Area ${t} mm: ${(area.get(t) ?? 0).toFixed(2)} m2`);
    lines.push("");
  }

  lines.push(`Total: ${project.panels.length} pecas`);
  return lines.join("\n");
}
```

`base` remove o sufixo de espessura do material default. Cada bloco imprime a espessura própria. Balcão com corpo 18 e fundo 6 sai em dois blocos, duas compras. A linha de nomes entre parênteses a loja ignora, você usa pra conferir.

Link: `https://wa.me/?text=${encodeURIComponent(buildWhatsappOrder(project))}`.

### 7.2 CSV

```typescript
function buildCsv(project: Project): string {
  const groups = groupPieces(project.panels).sort((a, b) => a.thickness - b.thickness);
  const head = "qtd,largura_mm,altura_mm,espessura_mm,fita_sup,fita_inf,fita_esq,fita_dir,nomes";
  const rows = groups.map(g =>
    [g.qty, g.width, g.height, g.thickness,
     +g.edges.top, +g.edges.bottom, +g.edges.left, +g.edges.right,
     `"${g.names.join("; ")}"`].join(",")
  );
  return [head, ...rows].join("\n");
}
```

Ordenado por espessura. Coluna `nomes` entre aspas, nomes separados por ponto e vírgula, seguro contra a vírgula do CSV.

---

## 8. JSON do projeto (persistência)

O arquivo salvo é o objeto `Project` serializado direto. Sem transformação.

```typescript
function exportProject(project: Project): Blob {
  const json = JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
  return new Blob([json], { type: "application/json" });
}

function importProject(text: string): Project {
  const raw = JSON.parse(text);
  if (raw.schemaVersion !== 1) throw new Error("Versao de schema incompativel");
  if (!Array.isArray(raw.panels)) throw new Error("Projeto invalido");
  for (const p of raw.panels) {
    if (typeof p.thickness !== "number" || p.thickness <= 0) {
      throw new Error(`Espessura invalida em ${p.name ?? p.id}`);
    }
    if (typeof p.width !== "number" || p.width <= 0) {
      throw new Error(`Largura invalida em ${p.name ?? p.id}`);
    }
    if (typeof p.height !== "number" || p.height <= 0) {
      throw new Error(`Altura invalida em ${p.name ?? p.id}`);
    }
    // completa campos ausentes de projetos antigos
    p.visible ??= true;
    p.type ??= "";
  }
  raw.appVersion ??= "0.1.0";
  return raw as Project;
}
```

LocalStorage entra só como autosave de conveniência, nunca como única cópia. Fonte de verdade é o arquivo que o usuário baixa.

---

## 9. Operações do editor (mutações)

Todas puras: recebem estado, devolvem estado novo. Habilita undo/redo trivial por pilha de snapshots, se necessário depois. Undo/redo não é V1.

```typescript
function addPanel(project: Project, panel: Panel): Project;
function updatePanel(project: Project, id: UUID, patch: Partial<Panel>): Project;
function removePanel(project: Project, id: UUID): Project;
```

### duplicatePanel

Desloca em X pela extensão real da peça no mundo mais folga. Usa `panelBox`, não `width` local. Painel deitado tem extensão diferente da dimensão local. Nasce ao lado, sem colidir.

```typescript
const DUP_GAP: Millimeters = 32;

function nextCopyName(name: string): string {
  const m = name.match(/^(.*?) \(copia(?: (\d+))?\)$/);
  if (!m) return `${name} (copia)`;
  const n = m[2] ? parseInt(m[2], 10) + 1 : 2;
  return `${m[1]} (copia ${n})`;
}

function duplicatePanel(project: Project, id: UUID): Project {
  const src = project.panels.find(p => p.id === id);
  if (!src) return project;
  const box = panelBox(src);
  const extentX = box.max.x - box.min.x;
  const copy: Panel = {
    ...src,
    id: crypto.randomUUID(),
    name: nextCopyName(src.name),
    edges: { ...src.edges },
    position: { ...src.position, x: src.position.x + extentX + DUP_GAP },
  };
  return { ...project, panels: [...project.panels, copy] };
}
```

### rotate90

Cicla `upAxis` preservando o centro. Sem isso a peça salta ao girar. Recalcula `position` a partir do centro antigo e do novo tamanho.

```typescript
const UP_CYCLE: Record<UpAxis, UpAxis> = { y: "x", x: "z", z: "y" };

function boxSize(b: Box): Vec3 {
  return { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z };
}

function rotate90(project: Project, id: UUID): Project {
  const src = project.panels.find(p => p.id === id);
  if (!src) return project;

  const before = boxSize(panelBox(src));
  const center = {
    x: src.position.x + before.x / 2,
    y: src.position.y + before.y / 2,
    z: src.position.z + before.z / 2,
  };

  const rotated: Panel = { ...src, upAxis: UP_CYCLE[src.upAxis] };
  const after = boxSize(panelBox(rotated));
  rotated.position = {
    x: center.x - after.x / 2,
    y: center.y - after.y / 2,
    z: center.z - after.z / 2,
  };

  return { ...project, panels: project.panels.map(p => p.id === id ? rotated : p) };
}
```

---

## 10. Estrutura de arquivos

```
src/
  core/
    types.ts        // seção 3, inclui EditorState
    geometry.ts     // panelBox, seção 4
    collision.ts    // seção 5
    pieces.ts       // agrupamento e área, seção 6
    order.ts        // whatsapp e csv, seção 7
    project.ts      // export/import e mutações, seções 8 e 9
    index.ts        // reexporta o core
  render/
    scene.ts        // Three.js: câmera, luz, controles
    panelMesh.ts    // Panel -> Mesh, consome panelBox
    picking.ts      // seleção por clique
    highlight.ts    // vermelho em colisão, destaque em seleção
  ui/
    tree.ts         // árvore de painéis
    properties.ts   // painel de propriedades
    piecesPanel.ts  // lista de peças embaixo
    problemsPanel.ts// só colisões na V1
    toolbar.ts      // novo, salvar, abrir, exportar
  editorState.ts    // EditorState da sessão, fora do Project
  main.ts           // monta tudo
  style.css
index.html
```

Regra dura: `core/` não importa nada de `render/` nem `three`. O core é testável sem navegador. O renderer depende do core, nunca o contrário. `project.ts` fica com as cinco mutações puras curtas; se crescer, separa depois. Sem hierarquia de pastas especulativa agora.

## 10.1 Performance

Quatro regras, valem desde a V1:

- Render on demand. Redesenhar só quando o estado muda, nunca em loop contínuo de 60 FPS.
- Reutilizar materiais Three.js entre meshes iguais.
- Reutilizar geometria quando as dimensões não mudam.
- Atualizar transform do mesh existente em vez de recriar no `rotate90` e no arraste.
- OrbitControls não muda o estado do projeto, mas muda a câmera. Sem tratamento a tela congela ao orbitar. Ligar `controls.addEventListener("change", invalidate)` em `scene.ts`.

---

## 11. Fora da V1 (registrado para não voltar a discutir)

- Veio e orientação de chapa. V2.
- Nesting e plano de corte real. V2.
- Material por peça, compensado, HDF. V1.1.
- Criar com IA. V2.
- Perguntar ao projeto. Adiado sem data.
- Etiqueta de montagem com destaque. Adiado.
- Verificações além de colisão. Adiado.
- Undo/redo. Adiado.
- Snap e constraints. V2.

---

## 12. Stack

Vite + TypeScript + Three.js puro. Sem React Three Fiber. UI em HTML e CSS sobre o canvas. Render sob demanda com invalidação explícita: redesenha quando o estado muda, não em `requestAnimationFrame` contínuo. Alinhado com a seção 10.1.
