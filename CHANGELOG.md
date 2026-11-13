# Changelog

Todas as mudanças relevantes do projeto ficam aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Ferramentas de desenho: pincel e borracha, cinco cores prontas mais uma cor à escolha, e tamanho
  de 0,5 a 30 mm. Cada ferramenta lembra o próprio tamanho. Atalhos: B, E, [ e ].
- Desfazer e refazer traços, pelos botões ou por Ctrl+Z, Ctrl+Y e Ctrl+Shift+Z. "Limpar" também
  pode ser desfeito. O histórico guarda até 50 ações ou 128 MB (ADR 0005).
- `@tattdraw/paint-engine`: `History`, `includeEllipse` e `toPixelRect`, com testes.
- Pintura no modelo 3D com caneta (pressão afina e engrossa o traço) e mouse. O pincel é medido em
  milímetros de pele, então tem a mesma largura em qualquer parte do modelo.
- Dedo e arrastes começando fora do modelo giram a câmera em vez de pintar.
- Botão "Limpar" e medidor de fps; `?tex=4096` no endereço testa uma textura maior.
- `@tattdraw/paint-engine`: `brushRadius` e `uvScaleFromTriangle`, com testes.
- Estrutura do monorepo (npm workspaces) com TypeScript estrito, ESLint, Prettier e Vitest.
- `@tattdraw/viewer`: cena 3D com câmera orbital, luzes e um modelo provisório.
- `@tattdraw/paint-engine`: conversão UV → pixel e interpolação de traço com pressão, com testes.
- `@tattdraw/web`: app web que mostra a cena.
- CI no GitHub Actions, Git LFS para `assets/` e ADRs 0001 a 0004.

### Alterado

- Desfazer e Refazer viraram botões de ícone, para a barra caber numa linha no celular deitado.
- O modelo provisório agora tem o tamanho aproximado de um antebraço (medidas em metros).

### Corrigido

- Com a tela em pé, o modelo era cortado dos lados; agora o campo de visão se ajusta.
