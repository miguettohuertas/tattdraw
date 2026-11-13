# 0006 — Camadas como canvas transparentes combinados por região

- **Situação:** Aceita
- **Data:** 2026-11-13

## Contexto

O tatuador precisa separar partes do desenho (contorno, sombra, cor) para ocultar, reordenar,
ajustar a opacidade e apagar uma sem estragar as outras. Até aqui existia uma imagem só, com a cor
da pele e a pintura misturadas; por isso a borracha "pintava com a cor da pele".

Cada camada de 2048 × 2048 px ocupa 16 MB; de 4096 × 4096 px, 64 MB.

## Decisão

- **Uma camada = um canvas transparente.** O pincel desenha na camada ativa; a borracha usa
  `destination-out`, que torna transparente o que toca e revela as camadas de baixo e a pele.
- **Um canvas "composite" é a textura do modelo:** cor da pele mais as camadas visíveis, de baixo
  para cima, cada uma com a sua opacidade.
- **Recombinar só o que mudou.** A cada quadro, só o retângulo alterado é refeito no composite.
  Mudanças de estrutura (ocultar, reordenar, opacidade, criar, excluir) refazem a textura inteira.
- **Um backup só, compartilhado.** O backup do desfazer (ADR 0005) acompanha a camada em que se
  está pintando; ao trocar de camada, ele é recopiado uma vez. Um backup por camada dobraria a
  memória de todas.
- **Recortes guardados como canvas pequenos, copiados com `drawImage`.** As bordas dos traços são
  semitransparentes, e `getImageData`/`putImageData` perdem precisão nesses pixels a cada ida e
  volta. Com `drawImage`, desfazer e refazer devolvem a imagem exata.
- **Criar e excluir camada entram no histórico.** Excluir sem poder desfazer seria perigoso, e
  pedir confirmação a cada exclusão atrapalha. A camada excluída fica guardada no histórico até
  ele ser cortado pelos limites.
- **Fora do histórico:** ocultar, reordenar e mudar a opacidade. São reversíveis com um toque.
- **Limite de camadas:** 8 com textura de até 2048 px e 4 acima disso.
- **Pintar em camada oculta é bloqueado**, com um aviso na tela.
- As regras sem imagem (nomes, ordem, camada ativa após excluir) ficam no `paint-engine`.

## Consequências

- A borracha apaga de verdade, só na camada ativa.
- Memória com 8 camadas em 2048 px: 8 × 16 MB, mais composite, backup e a cópia na placa de
  vídeo. É o que define o limite de camadas; precisa ser medido em tablets modestos.
- Trocar de camada custa uma cópia completa para o backup, paga no primeiro traço (ou desfazer)
  na nova camada.
- Ocultar uma camada não pode ser desfeito com Ctrl+Z, só clicando no olho de novo.
- O formato de arquivo do projeto (ainda por fazer) terá de guardar uma imagem por camada.
