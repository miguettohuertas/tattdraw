# 0009 — Partes do corpo como receitas de um gerador de membros

- **Situação:** Aceita
- **Data:** 2026-11-20

## Contexto

Depois do antebraço (ADR 0008), o próximo pedido foi o braço, do ombro ao cotovelo. Outras
partes com formato de "tubo" (panturrilha, coxa) virão depois. O gerador do antebraço tinha a
forma escrita direto no código, com nomes de medida próprios dele (punho, antebraço, cotovelo).

Também era preciso decidir o que acontece com o desenho ao trocar de parte.

## Decisão

**Um gerador de membros, várias receitas.**

- `buildLimb(shape, medidas)` gera qualquer membro em forma de tubo. A receita (`LimbShape`) diz
  onde fica a parte mais grossa, o achatamento da seção nas pontas, os músculos (direção,
  largura, altura e trecho do comprimento), por onde passa a costura e o tamanho das tampas.
- As medidas passam a ter nomes genéricos: `lengthCm`, `distalCm` (ponta longe do tronco),
  `peakCm` (parte mais grossa) e `proximalCm` (ponta perto do tronco). Cada parte diz como elas
  se chamam para o tatuador (`fields`), os limites e os valores padrão.
- `BODY_PARTS` lista as partes. Uma parte nova é uma entrada nova ali; o painel do app é montado
  a partir dessa lista e não precisa mudar.
- O antebraço virou a primeira receita, gerada exatamente como antes.
- **Braço:** do cotovelo à axila, com bíceps na frente, tríceps atrás e deltoide no alto, do lado
  de fora. Perto do cotovelo, a seção é mais larga de um lado ao outro. A câmera vê o lado de
  fora do braço, com o bíceps para cima. A costura fica atrás e por dentro, encostada no corpo,
  o lugar menos visto. Padrão: 32, 25, 30 e 32 cm.

**Cada parte guarda o seu desenho.**

- O viewer mantém um "documento" por parte: as medidas e a superfície de pintura, com camadas e
  histórico próprios. É criado na primeira vez que a parte é aberta e guardado enquanto o app
  estiver aberto.
- Só a geometria é refeita ao trocar de parte (leva milissegundos).
- Só a superfície da parte atual avisa a tela (botões de desfazer, painel de camadas). Ao trocar,
  a tela recebe o estado da parte nova.
- A câmera volta à posição inicial ao trocar, sem o "embalo" de um giro recente.
- Não dá para trocar de parte no meio do posicionamento de um carimbo.

## Consequências

- Panturrilha e coxa ficam baratas: só receitas novas e testes.
- Cada parte aberta ocupa a memória da sua superfície (camadas, composição e backup). Com duas
  partes em 2048 px, isso é aceitável; com muitas partes e muitas camadas, pode ser preciso
  liberar as partes não usadas.
- O desenho de cada parte ainda vive só na memória: fechar o app perde tudo. Salvar projeto é um
  passo futuro, e o formato vai precisar guardar um documento por parte.
- Costas e peito não cabem neste gerador (não são tubos) e vão precisar de outro.
