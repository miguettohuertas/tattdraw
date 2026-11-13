# TattDraw

App para tatuadores modelarem a parte do corpo do cliente em 3D, desenharem a tatuagem nela e
gravarem um vídeo para mostrar como vai ficar. Roda no navegador e, empacotado com Capacitor, em
tablets e celulares Android.

> Estado atual: **prova de conceito**. Dá para pintar com caneta ou mouse num modelo provisório
> (uma cápsula do tamanho de um antebraço) e desfazer ou refazer cada traço. Ainda faltam camadas,
> carimbos e vídeo.

## Como usar

| Ação                                                 | Resultado                               |
| ---------------------------------------------------- | --------------------------------------- |
| Caneta ou botão esquerdo do mouse **sobre o modelo** | Pinta (a caneta usa a pressão)          |
| Arrastar começando **fora** do modelo                | Gira a câmera                           |
| Arrastar com **um dedo**                             | Gira a câmera (o dedo nunca pinta)      |
| Pinça com dois dedos, ou roda do mouse               | Aproxima e afasta                       |
| Botão direito do mouse                               | Arrasta a cena                          |
| Botão **Desfazer** ou Ctrl+Z                         | Desfaz o último traço                   |
| Botão **Refazer**, Ctrl+Y ou Ctrl+Shift+Z            | Refaz o traço desfeito                  |
| Botão **Limpar**                                     | Apaga toda a pintura (dá para desfazer) |

O histórico guarda até 50 ações (ou 128 MB de recortes da textura); as mais antigas são esquecidas.

O canto inferior esquerdo mostra o tamanho da textura e os quadros por segundo. Para testar o
limite do aparelho, abra o app com `?tex=4096` no fim do endereço (o padrão é 2048).

## Começando

Você precisa de:

- [Node.js](https://nodejs.org/) 22.12 ou superior (o arquivo `.nvmrc` indica a versão).
- [Git](https://git-scm.com/) e [Git LFS](https://git-lfs.com/) (`git lfs install`, uma vez por máquina).

```bash
npm install        # instala as dependências de todos os pacotes
npm run dev        # abre o app em http://localhost:5173
```

Para testar no tablet: deixe o tablet na mesma rede Wi-Fi e abra o endereço "Network" que o
`npm run dev` mostra no terminal.

## Comandos

| Comando             | O que faz                                                     |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento com recarga automática            |
| `npm run build`     | Gera a versão final do app web em `apps/web/dist/`            |
| `npm run preview`   | Serve o build final para conferir antes de publicar           |
| `npm test`          | Roda os testes uma vez (`npm run test:watch` fica observando) |
| `npm run lint`      | Procura erros prováveis no código (ESLint)                    |
| `npm run typecheck` | Confere os tipos do TypeScript                                |
| `npm run format`    | Formata todos os arquivos (Prettier)                          |
| `npm run check`     | Formatação + lint + tipos + testes: rode antes de cada commit |

## Como o projeto está organizado

```text
tattdraw/
├─ apps/
│  └─ web/                # o app: HTML, ponto de entrada e configuração do Vite
├─ packages/
│  ├─ paint-engine/       # lógica de pintura, sem UI e sem three.js (testável)
│  └─ viewer/             # cena 3D: câmera, luzes, modelo, materiais
├─ assets/                # modelos .glb e texturas (Git LFS) + licenças
├─ docs/adr/              # registro das decisões de arquitetura
└─ .github/workflows/     # CI: verificações automáticas a cada push
```

Ainda vão entrar: `packages/project-format` (arquivo de projeto com versão), `packages/recorder`
(gravação de vídeo) e `apps/mobile` (Capacitor para Android).

A regra principal: **`apps/` usa `packages/`, nunca o contrário**, e `paint-engine` não depende de
nada visual. Assim a lógica difícil pode ser testada sozinha.

### Arquivos de configuração da raiz

| Arquivo              | Para que serve                                                       |
| -------------------- | -------------------------------------------------------------------- |
| `package.json`       | Define os workspaces (`apps/*`, `packages/*`), scripts e ferramentas |
| `tsconfig.base.json` | Regras do TypeScript compartilhadas, no modo estrito                 |
| `tsconfig.json`      | Diz quais pastas o `npm run typecheck` confere                       |
| `eslint.config.js`   | Regras do ESLint                                                     |
| `.prettierrc.json`   | Estilo de formatação (aspas simples, linhas de até 100 colunas)      |
| `vitest.config.ts`   | Onde ficam os testes (`*.test.ts` ao lado do código)                 |
| `.gitignore`         | O que o Git ignora (dependências, builds, segredos)                  |
| `.gitattributes`     | Finais de linha e quais arquivos vão para o Git LFS                  |
| `.editorconfig`      | Indentação e codificação iguais em qualquer editor                   |
| `.nvmrc`             | Versão do Node usada no projeto e no CI                              |
| `.vscode/`           | Extensões recomendadas e formatar ao salvar no VS Code               |

## Fluxo de trabalho com Git

- A branch `main` sempre funciona. Cada tarefa nova nasce numa branch própria:
  `git switch -c feat/pincel-basico`.
- Mensagens de commit seguem o [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

  | Prefixo     | Quando usar                             | Exemplo                                      |
  | ----------- | --------------------------------------- | -------------------------------------------- |
  | `feat:`     | Funcionalidade nova                     | `feat(paint-engine): pincel com pressão`     |
  | `fix:`      | Correção de erro                        | `fix(viewer): corrige zoom no tablet`        |
  | `docs:`     | Só documentação                         | `docs: explica o formato de projeto`         |
  | `test:`     | Só testes                               | `test(paint-engine): cobre UV fora da faixa` |
  | `refactor:` | Muda o código sem mudar o comportamento | `refactor(viewer): separa as luzes`          |
  | `chore:`    | Configuração, dependências, ferramentas | `chore: atualiza three.js`                   |

- Rode `npm run check` antes de cada commit. O CI roda o mesmo no GitHub.
- Versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/) e cada lançamento é
  anotado no `CHANGELOG.md`.

## Custos

O projeto usa só ferramentas gratuitas (veja `docs/adr/0004-somente-ferramentas-gratuitas.md`).
O único custo para publicar é a taxa única de US$ 25 da conta de desenvolvedor do Google Play.
