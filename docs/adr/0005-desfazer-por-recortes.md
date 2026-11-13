# 0005 — Desfazer guardando recortes da textura

- **Situação:** Aceita
- **Data:** 2026-11-12

## Contexto

O tatuador precisa desfazer e refazer traços. A pintura é uma textura grande: 2048 × 2048 px ocupam
16 MB na memória, e 4096 × 4096 px ocupam 64 MB. O app vai rodar em tablets, com memória limitada.

Opções avaliadas:

1. **Cópia da textura inteira a cada traço.** Simples, mas 20 traços em 4096 px custariam 1,3 GB.
2. **Regravar os traços** (guardar os pontos da caneta e redesenhar tudo ao desfazer). Gasta pouca
   memória, mas desfazer fica mais lento a cada traço e exige que o desenho seja sempre idêntico
   ao ser refeito, o que complica carimbos e imagens importadas.
3. **Recorte da região alterada.** Guardar só o retângulo que o traço tocou, como estava antes.

## Decisão

Opção 3, com estas regras:

- Um segundo canvas (o "backup") guarda a pintura como estava antes do traço em andamento.
- Durante o traço, acompanhamos o retângulo que os carimbos tocaram.
- Ao soltar a caneta, o recorte desse retângulo no backup vai para o histórico e o backup é
  atualizado.
- Desfazer devolve o recorte à pintura e guarda o recorte atual para o refazer. Cada ação ocupa
  memória uma vez só.
- Limites: 50 ações ou 128 MB de recortes; as mais antigas são descartadas primeiro. A ação mais
  recente sempre é mantida.
- As pilhas e o cálculo do retângulo ficam no `paint-engine` (testados sem navegador); os canvas
  ficam no `viewer`.

## Consequências

- Um traço comum guarda poucos kB a poucos MB, em vez de 16 a 64 MB.
- Custo fixo: o backup dobra a memória da textura (mais 16 MB em 2048 px, mais 64 MB em 4096 px).
- "Limpar" guarda um recorte da textura inteira. É aceitável por ser raro.
- Um traço que cruza a costura do UV gera um retângulo da largura toda da textura, portanto um
  recorte maior. Deve melhorar com o mapa UV do modelo de corpo definitivo.
- Quando entrarem as camadas, cada item do histórico precisará dizer a qual camada pertence.
