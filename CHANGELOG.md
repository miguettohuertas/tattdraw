# Changelog

Todas as mudanças relevantes do projeto ficam aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Estrutura do monorepo (npm workspaces) com TypeScript estrito, ESLint, Prettier e Vitest.
- `@tattdraw/viewer`: cena 3D com câmera orbital, luzes e um modelo provisório.
- `@tattdraw/paint-engine`: conversão UV → pixel e interpolação de traço com pressão, com testes.
- `@tattdraw/web`: app web que mostra a cena.
- CI no GitHub Actions, Git LFS para `assets/` e ADRs 0001 a 0004.
