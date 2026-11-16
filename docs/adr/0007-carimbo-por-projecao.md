# 0007 — Carimbo por projeção, gravado no espaço UV

- **Situação:** Aceita
- **Data:** 2026-11-16

## Contexto

O tatuador quer colocar sobre a pele um desenho pronto (flash, estêncil, foto de um desenho no
papel), ajustar posição, tamanho e rotação e ver como fica antes de confirmar. Depois de
aplicado, o desenho precisa se comportar como o resto da pintura: borracha, camadas, desfazer.

Opções avaliadas:

1. **Desenhar a imagem direto na textura**, com uma transformação 2D no ponto tocado (como o
   carimbo do pincel). Simples, mas a imagem entorta onde o mapa UV estica, é cortada nas
   costuras do UV e não acompanha bem a curvatura.
2. **`DecalGeometry` do three.js**: cria uma malha extra recortada no formato da imagem. Mostra
   bem, mas o resultado é uma malha separada, não pixels na textura: não funcionaria com borracha
   nem camadas, e passar isso para a textura cairia no mesmo problema da opção 4.
3. **Projeção em tempo real só na tela**, sem nunca gravar na textura. Mesmo problema da opção 2.
4. **Projeção, gravada no espaço UV.** Projetar a imagem sobre a pele como um projetor de slides
   e, ao aplicar, desenhar o modelo "aberto" no espaço UV, perguntando à projeção a cor de cada
   pixel da textura.

## Decisão

Opção 4:

- O projetor fica apontado para a pele ao longo da **normal** no ponto escolhido, com projeção
  ortográfica (sem perspectiva). A matriz do projetor leva um ponto do mundo para coordenadas em
  que a imagem ocupa de -0,5 a 0,5.
- **Prévia:** uma cópia do modelo desenhada por cima da pele, com o mesmo `MeshStandardMaterial`
  (mesma rugosidade), trocando no shader a busca da cor pelo UV pela busca pela projeção
  (`onBeforeCompile`). Como a luz é a mesma, a prévia é igual ao resultado aplicado.
- **Aplicar:** um `ShaderMaterial` que posiciona cada vértice no seu UV (`gl_Position = uv × 2 − 1`)
  e calcula a cor pela mesma projeção, renderizado num `WebGLRenderTarget` do tamanho da textura.
  Os pixels são lidos de volta e viram uma **camada nova**, num único passo de histórico.
- A mesma conta em GLSL é usada nos dois shaders, para não divergirem.
- A projeção só pinta onde a pele está de frente para o projetor (cosseno do ângulo acima de 0,2)
  e dentro de uma profundidade igual ao lado maior da imagem, para não atravessar para o outro
  lado do braço.
- O "para cima" da imagem começa igual ao da tela e é carregado de um ponto ao outro quando a
  imagem é arrastada, para ela não girar sozinha.
- O tamanho é o **lado maior** da imagem, em milímetros na pele.
- Imagens sem nenhuma transparência (JPG, fotos) começam com o fundo branco convertido em
  transparente, pela fórmula de "cor para alfa" (`whiteToAlpha` no `paint-engine`), que mantém a
  aparência sobre branco. O usuário pode desligar.
- Imagens maiores que 2048 px são reduzidas ao carregar.

## Consequências

- A imagem respeita a curvatura e as costuras do UV automaticamente; a borracha, as camadas e o
  desfazer funcionam nela sem código especial.
- **Esticamento nas laterais:** a projeção é "de frente". Num braço, uma imagem larga estica
  perto das bordas visíveis e some quando a pele fica de lado demais. Para enrolar um desenho em
  volta do braço sem esticar seria preciso uma projeção que siga a superfície; fica para quando
  houver o modelo de corpo definitivo.
- Pode aparecer um fio fino na costura do UV, porque os pixels de cada lado da costura são
  desenhados separadamente e não há "transbordamento" (dilatação) das bordas.
- A prévia aparece por cima de todas as camadas, mas o resultado entra logo acima da camada
  escolhida; se houver camadas acima dela, elas vão cobrir a imagem.
- Ler os pixels da placa de vídeo custa alguns milissegundos (16 MB em 2048 px, 64 MB em
  4096 px), pagos só ao tocar em Aplicar.
