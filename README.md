# App Marcenaria

App web para o marceneiro montar o projeto em painéis, marcar fita de borda e mandar o pedido de corte para a madeireira.

Produção: [marcenaria.morla.com.br](https://marcenaria.morla.com.br) — **versão V0** em produção.

## O que faz

- Desenha peças em 3D (largura, altura, espessura, posição)
- Marca fita de borda por lado (superior, inferior, esquerda, direita)
- Agrupa peças que se movem juntas (caixotes, conjuntos)
- Magnetiza peças ao arrastar (encaixe face a face)
- Mostra cotas entre peças selecionadas
- Detecta colisões e peças sobrepostas
- Salva automaticamente no navegador
- Desfazer / refazer alterações
- Exporta pedido por **WhatsApp** (texto pronto) e **CSV**
- Funciona no celular (Safari iOS e Chrome Android)

O pedido WhatsApp inclui, no final, a **área total por espessura**, a **metragem de fita** e a **quantidade de peças**.

## O que não faz (por enquanto)

Sem veio de madeira, sem nesting de chapa, sem orçamento automático e sem PDF. Isso entra na V1/V2.

Escopo completo, regras de domínio e roadmap: `SPEC.md`.

## Desenvolvimento local

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes
npm run build    # build de produção
npm run type-check
```

## Deploy (Docker)

```bash
./scripts/deploy.sh
```

Usa a tag do commit atual (`IMAGE_TAG`). O container sobe na porta interna 8080 com nginx.

## Estrutura do código

| Pasta | Conteúdo |
|-------|----------|
| `src/core/` | Regras de negócio puras (peças, pedido, grupos, histórico). Sem DOM nem Three.js. |
| `src/app/` | Orquestração do editor (estado, cena, input). |
| `src/render/` | Visualização 3D (Three.js). |
| `src/ui/` | Árvore de peças, propriedades, toolbar, painéis mobile. |
| `src/main.ts` | Bootstrap mínimo — só inicia o app. |

Novas funcionalidades médias devem nascer em `src/app/` ou `src/ui/`, não em `main.ts`.

## Stack

Vite, TypeScript, Three.js. Testes com Vitest.
