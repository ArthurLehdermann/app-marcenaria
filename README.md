# Motor de Marcenaria

Editor de paineis com exportacao de pedido de corte e fita para madeireira.

Desenhar movel, marcar fitas por lado, exportar pedido (WhatsApp / CSV / PDF). Sem veio, sem nesting, sem IA na V1.

## Escopo V1

Ver SPEC.md. Spec congelada em spec-v1.0.

Criterio: se nao for necessario para pedir MDF cortado e fitado na proxima semana, fica para V2.

## Stack

Vite + TypeScript + Three.js puro. Core sem dependencia de renderer nem DOM.

## Desenvolvimento

```
npm install
npm run test
```

## Estrutura

- `src/core/` dominio puro, testavel sem navegador. Nunca importa Three.js.
- `src/app/` orquestracao do editor (estado, cena, input). `main.ts` so bootstrap.
- `src/render/` renderer Three.js.
- `src/ui/` arvore, propriedades, toolbar e paineis.

## Progresso

- [x] types, geometry, collision + testes
- [ ] pieces, order + testes
- [ ] project: import/export/mutacoes + testes
- [ ] renderer Three.js
- [ ] selecao e propriedades
- [ ] exportacao WhatsApp/CSV/PDF
