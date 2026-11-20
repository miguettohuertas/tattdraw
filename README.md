# TattDraw

App para tatuadores modelarem a parte do corpo do cliente em 3D, desenharem a tatuagem nela e
gravarem um vídeo para mostrar como vai ficar. Roda no navegador e, empacotado com Capacitor, em
tablets e celulares Android.

> Estado atual: **prova de conceito**. Dá para escolher a parte do corpo (antebraço ou braço),
> ajustá-la às medidas do cliente, pintar com caneta ou mouse, escolher cor e tamanho, apagar,
> desfazer, trabalhar em camadas e aplicar desenhos prontos. Ainda faltam salvar o trabalho,
> outras partes do corpo e vídeo.

## Como usar

| Ação                                                 | Resultado                                         |
| ---------------------------------------------------- | ------------------------------------------------- |
| Caneta ou botão esquerdo do mouse **sobre o modelo** | Pinta (a caneta usa a pressão)                    |
| Arrastar começando **fora** do modelo                | Gira a câmera                                     |
| Arrastar com **um dedo**                             | Gira a câmera (o dedo nunca pinta)                |
| Pinça com dois dedos, ou roda do mouse               | Aproxima e afasta                                 |
| Botão direito do mouse                               | Arrasta a cena                                    |
| Ícone de lápis, ou tecla B                           | Pincel: pinta com a cor escolhida                 |
| Ícone de borracha, ou tecla E                        | Borracha: apaga só a camada escolhida             |
| Bolinhas de cor                                      | Escolhem a cor (a última abre o seletor de cores) |
| Controle de tamanho, ou teclas [ e ]                 | Largura do traço, de 0,5 a 30 mm                  |
| Botão ↶ ou Ctrl+Z                                    | Desfaz a última ação                              |
| Botão ↷, Ctrl+Y ou Ctrl+Shift+Z                      | Refaz a ação desfeita                             |
| Ícone de folhas empilhadas                           | Abre e fecha o painel de camadas (Esc fecha)      |
| Ícone de régua                                       | Abre e fecha o painel Corpo (parte e medidas)     |
| Ícone de imagem                                      | Importa um desenho pronto para usar como carimbo  |

O tamanho é a largura do traço na pele com pressão máxima da caneta; com pouca pressão, o traço
fica mais fino. O pincel e a borracha lembram cada um o seu tamanho.

### Camadas

Uma camada é uma folha transparente por cima da pele. O pincel e a borracha agem só na camada
escolhida, que aparece destacada no painel. A lista mostra a camada de cima primeiro.

| No painel     | Resultado                                                    |
| ------------- | ------------------------------------------------------------ |
| Tocar no nome | Escolhe a camada em que se desenha                           |
| Olho          | Oculta ou mostra a camada (não dá para desenhar numa oculta) |
| Opacidade     | Deixa a camada escolhida mais transparente                   |
| **+**         | Cria uma camada vazia acima da escolhida                     |
| ↑ e ↓         | Sobe ou desce a camada na pilha                              |
| **Limpar**    | Apaga tudo da camada escolhida                               |
| Lixeira       | Exclui a camada (sempre sobra pelo menos uma)                |

Desenhar, apagar, limpar, criar e excluir camada podem ser desfeitos. Ocultar, reordenar e mudar
a opacidade não entram no histórico. O limite é de 8 camadas (4 com `?tex=4096`).

### Parte do corpo e medidas

No painel Corpo (ícone de régua), os botões no alto escolhem a parte do corpo. **Cada parte
guarda o seu próprio desenho**, com camadas e histórico separados: trocar de parte não apaga
nada, e voltar traz tudo como estava. A câmera volta à posição inicial na troca.

Cada parte é gerada a partir de quatro medidas, tiradas do cliente com uma fita métrica.

**Antebraço** (padrão 26, 16, 26 e 24 cm)

| Medida      | Onde medir                                      | Limites    |
| ----------- | ----------------------------------------------- | ---------- |
| Comprimento | Do punho até a dobra do cotovelo                | 16 a 36 cm |
| Punho       | Circunferência logo acima do osso do punho      | 11 a 24 cm |
| Antebraço   | Circunferência na parte mais grossa             | 16 a 42 cm |
| Cotovelo    | Circunferência logo abaixo da dobra do cotovelo | 16 a 40 cm |

**Braço** (padrão 32, 25, 30 e 32 cm)

| Medida      | Onde medir                                                | Limites    |
| ----------- | --------------------------------------------------------- | ---------- |
| Comprimento | Da dobra do cotovelo até a altura da axila                | 22 a 44 cm |
| Cotovelo    | Circunferência logo acima da dobra do cotovelo            | 18 a 40 cm |
| Bíceps      | Circunferência na parte mais grossa, com o braço relaxado | 20 a 55 cm |
| Axila       | Circunferência no alto do braço, na altura da axila       | 22 a 58 cm |

**Ajuste as medidas antes de desenhar:** o desenho acompanha a pele, então estica se o braço
mudar depois. "Restaurar medidas" volta a parte atual ao padrão dela. Mudar as medidas não
entra no histórico. Detalhes em `docs/adr/0008-antebraco-parametrico.md` e
`docs/adr/0009-partes-do-corpo.md`.

### Carimbo (desenho pronto)

O ícone de imagem abre a galeria ou os arquivos. A imagem aparece no centro da tela, projetada
sobre a pele, e a barra de baixo substitui a de cima até você aplicar ou cancelar.

| Ação                                       | Resultado                                    |
| ------------------------------------------ | -------------------------------------------- |
| Arrastar com a caneta ou o mouse no modelo | Move a imagem                                |
| Tocar rápido com o dedo no modelo          | Leva a imagem até esse ponto                 |
| Arrastar com o dedo                        | Gira a câmera, para ver de outro ângulo      |
| **Tamanho**                                | Lado maior da imagem na pele, de 10 a 250 mm |
| **Girar**                                  | Gira a imagem sobre a pele                   |
| **Sem fundo**                              | Transforma o fundo branco em transparente    |
| **Aplicar** ou Enter                       | Grava a imagem numa camada nova              |
| **Cancelar** ou Esc                        | Descarta a imagem                            |

"Sem fundo" já começa ligado em imagens sem transparência (JPG, fotos, desenhos escaneados).
A camada criada leva o nome do arquivo e funciona como qualquer outra: dá para apagar partes,
mudar a opacidade ou desfazer. A imagem é projetada de frente, então estica perto das bordas do
braço (veja `docs/adr/0007-carimbo-por-projecao.md`).

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
│  ├─ body/               # partes do corpo geradas por medidas (antebraço e braço)
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
