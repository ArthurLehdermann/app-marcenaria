# App Marcenaria — Especificação

**spec-v0.1** — documenta o que existe hoje (V0) e o que vem depois.

Produção: [marcenaria.morla.com.br](https://marcenaria.morla.com.br)

---

## Versões

| Versão | Status | Objetivo |
|--------|--------|----------|
| **V0** | **Em produção** | App web funcional: desenhar peças, marcar fita, agrupar, exportar pedido. |
| **V1** | Planejada | Fechar o fluxo “pedir MDF cortado e fitado na semana” sem atrito. |
| **V2+** | Futuro | Veio, nesting, PDF, orçamento, IA, etc. |

Tudo que está no repositório hoje é **V0**. A spec antiga chamava isso de “V1 congelada”; essa numeração foi corrigida.

**Critério de escopo (V1 em diante):** se não for necessário para pedir MDF cortado e fitado na próxima semana, fica para depois.

**Fora de qualquer versão próxima:** veio de madeira, nesting de chapa, orçamento automático, receitas, IA, persistência em servidor.

---

## V0 — O que o app faz hoje

### Para o marceneiro

- Criar peças com largura, altura, espessura e posição no espaço 3D
- Girar peça em 90° (eixo único, sem ângulo livre)
- Marcar fita de borda por lado (superior, inferior, esquerda, direita)
- Agrupar peças que se movem juntas; editar fita de cada membro do grupo
- Ocultar peças (só visual — continuam no pedido)
- Arrastar peças no canvas; magnetizar face a face (toggle no menu)
- Ver cotas entre peças selecionadas
- Alerta de colisão entre peças visíveis
- Desfazer / refazer (histórico local)
- Autosave no navegador + exportar/importar JSON
- Exportar pedido por **WhatsApp** (texto) e **CSV**
- Usar no celular (Safari iOS, Chrome Android)

### Pedido WhatsApp (formato atual)

```
Olá! Corte e fita:

MDF Ultra 18 mm
2x 600x742 | Inf Esq Dir
1x 720x560 | Sup

0.89 m2, 4.17 m fita, 3 pecas
```

- Blocos separados por espessura de chapa
- Linha compacta: `qtd x LARGxALT | lados da fita`
- Rodapé: área (m²), metragem total de fita (m) e quantidade de peças
- Quebras em CRLF para o WhatsApp

### Pedido CSV

Colunas: `qtd, largura_mm, altura_mm, espessura_mm, fita_sup, fita_inf, fita_esq, fita_dir, nomes` — ordenado por espessura.

### O que a V0 ainda não faz

- PDF do pedido
- Veio / orientação de chapa
- Nesting e plano de corte
- Material ou espessura por peça (herda do projeto)
- Orçamento ou preço

---

## Decisões de domínio (valem na V0 e adiante)

- **Unidade:** milímetro (`number`).
- **Eixos:** X = largura, Y = altura, Z = profundidade. Origem do painel = canto inferior traseiro esquerdo.
- **Painel:** caixa axis-aligned. Rotação só em 90° via `upAxis` (`"y"` em pé, `"x"` / `"z"` deitado).
- **Pedido:** dimensão de corte = `width × height` do painel, independente de `upAxis`.
- **Agrupamento no pedido:** peças idênticas (mesmas dimensões + mesma fita) viram uma linha com `qty`. `720×560` e `560×720` **não** normalizam — linhas separadas, fita não migra de lado.
- **Colisão:** tolerância 0,5 mm. Encosto perfeito (overlap 0 em um eixo) não alerta. Na V0, só peças **visíveis** entram na detecção.
- **`visible`:** ocultar não exclui. Peça oculta entra no pedido e na lista de peças; no canvas e na árvore fica não clicável (olho e engrenagem continuam ativos).
- **`defaultMaterial`:** rótulo de texto no pedido. Não afeta geometria nem corte.
- **`EditorState` ≠ `Project`:** seleção, câmera, flags de UI não persistem no JSON do projeto.
- **Render on demand:** redesenha quando o estado muda, sem loop contínuo a 60 FPS.

---

## Tipos do core (schema v2)

```typescript
type Panel = {
  id: UUID;
  name: string;
  width: Millimeters;
  height: Millimeters;
  thickness: Thickness;
  position: Vec3;
  upAxis: UpAxis;
  edges: Record<EdgeSide, boolean>;
  color: string;
  visible: boolean;
  groupId?: UUID;
};

type PanelGroup = {
  id: UUID;
  name: string;
  memberOrder?: UUID[];
};

type Project = {
  id: UUID;
  name: string;
  settings: { defaultMaterial: string; defaultThickness: Thickness };
  panels: Panel[];
  groups: PanelGroup[];
  treeOrder?: UUID[];
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  schemaVersion: 2;
};

type EditorState = {
  selectedPanelIds: UUID[];
  hoveredPanelId?: UUID;
  showCollisions: boolean;
  groupPickMode: boolean;
  snapEnabled: boolean;
  camera: { position: Vec3; target: Vec3 };
};
```

Migração: projetos com `schemaVersion: 1` são importados e promovidos para `2` (campos `groups`, `treeOrder`, etc.).

---

## Agrupamento de peças no pedido

```typescript
function groupPieces(panels: Panel[]): GroupedPiece[]

function areaByThicknessM2(panels: Panel[]): Map<Thickness, number>

function totalEdgeBandingM(panels: Panel[]): number
// Soma comprimento dos lados marcados: top/bottom = width, left/right = height
```

Sem área total única no rodapé quando há mais de uma espessura — cada espessura é uma compra de chapa distinta.

---

## Persistência

| Canal | Papel |
|-------|--------|
| **Arquivo JSON** | Fonte de verdade. Exportar / importar pelo menu. |
| **localStorage** | Autosave de conveniência. Não substitui o arquivo. |

Histórico undo/redo: pilha de snapshots (`cloneProject`). Melhorias de memória (snapshots parciais) ficam anotadas para depois — sem urgência na V0.

---

## Estrutura de arquivos

```
src/
  core/           # Domínio puro — sem DOM, sem Three.js
    types.ts      # Panel, Project, EditorState
    geometry.ts   # panelBox
    collision.ts
    pieces.ts     # groupPieces, área, metragem de fita
    order.ts      # WhatsApp, CSV
    project.ts    # import/export, mutações
    groups.ts     # blocos de peças
    history.ts    # undo/redo
    snap.ts       # magnetizar ao arrastar
    gaps.ts       # cotas entre selecionados
    treeOrder.ts  # ordem na árvore
    projectStorage.ts
  app/            # Orquestração do editor
    createApp.ts
    sceneSync.ts
    canvasInput.ts
    selectionQuery.ts
    mobileProps.ts
    ...
  render/         # Three.js
  ui/             # Árvore, propriedades, toolbar, mobile
  editorState.ts
  main.ts         # Bootstrap mínimo
```

**Regra:** `core/` não importa `render/` nem `three`. Novas features médias entram em `app/` ou `ui/`, não em `main.ts` (limite ~100 linhas).

---

## V1 — Próximos passos (planejado)

Objetivo: o marceneiro consegue pedir corte e fita na madeireira sem planilha paralela.

Candidatos (prioridade a definir):

- [ ] PDF do pedido (mesmos dados do WhatsApp/CSV)
- [ ] Polir fluxo mobile (menos atrito ao editar fita em grupo)
- [ ] Revisar spec de peças ocultas no pedido (incluir/excluir com toggle explícito?)
- [ ] Testes E2E mínimos do fluxo exportar → WhatsApp

Regra de disciplina: feature nova de complexidade média não entra sem caber na estrutura `app/` / `ui/`, não no `main.ts`.

---

## V2+ — Registrado para não rediscutir

- Veio e orientação de chapa
- Nesting e plano de corte real
- Material por peça, compensado, HDF
- Criar com IA / assistente
- Etiquetas de montagem
- Orçamento e preço
- Snapshots parciais no histórico (otimização)
- Persistência em servidor / conta de usuário

---

## Stack

Vite + TypeScript + Three.js. UI em HTML/CSS sobre o canvas. Testes com Vitest. Deploy: Docker + nginx.
