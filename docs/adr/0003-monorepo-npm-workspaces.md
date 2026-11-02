# 0003 — Monorepo com npm workspaces

- **Situação:** Aceita
- **Data:** 2026-11-02

## Contexto

O app tem partes que precisam ficar separadas (motor de pintura, cena 3D, formato de projeto,
gravação) e dois "apps" que as usam (web e Android).

## Decisão

Um único repositório, com **npm workspaces**:

- `apps/` — o que o usuário abre (web; depois mobile).
- `packages/` — bibliotecas internas, cada uma com uma responsabilidade.

Os pacotes exportam o código-fonte TypeScript direto (`"exports": "./src/index.ts"`); o Vite compila
tudo junto. Não há etapa de build por pacote.

Escolhemos npm workspaces em vez de pnpm, Nx ou Turborepo porque já vem com o Node: menos
ferramentas para aprender agora. Dá para migrar depois se o build ficar lento.

## Consequências

- Uma mudança que toca motor e app vira um único commit.
- `paint-engine` não pode importar nada de UI nem de three.js: assim ele é testável e reaproveitável.
