# 0008 — Antebraço paramétrico gerado por medidas

- **Situação:** Aceita
- **Data:** 2026-11-20

## Contexto

A cápsula provisória precisava dar lugar a uma parte do corpo de verdade. O objetivo do app é
modelar a parte do corpo do cliente "do jeito mais real possível" e desenhar nela com detalhe de
traço de tatuagem.

Opções avaliadas:

1. **Corpo inteiro pronto** (por exemplo, exportado do MakeHuman). Forma realista, mas o mapa de
   textura de um corpo inteiro é dividido entre todas as partes: numa textura de 2048 px, o
   antebraço ficaria com algo em torno de 150 px de largura, pouco para traço fino. Além disso,
   o mapa UV tem várias "ilhas" e costuras pensadas para pintar pele, não para tatuagem, e mudar
   as medidas exigiria um sistema de deformação (morph targets) à parte.
2. **Modelo esculpido à mão** (Blender, Nomad), com UV próprio. Bom resultado, mas é trabalho de
   arte que precisa ser refeito para cada biotipo, e as medidas do cliente não entram.
3. **Modelo paramétrico gerado pelo código**, a partir das medidas que o tatuador tira com uma
   fita: comprimento e três circunferências.

## Decisão

Opção 3, num pacote novo, `@tattdraw/body`, que só faz contas (não depende de three.js):

- **Medidas:** comprimento (punho → dobra do cotovelo) e circunferências do punho, da parte mais
  grossa e do cotovelo, em centímetros, com limites para valores absurdos. Padrão de adulto
  médio: 26, 16, 26 e 24 cm.
- **Perfil:** a circunferência sai do punho, chega ao máximo em 70% do comprimento e afina até o
  cotovelo, com transições suaves. As três circunferências são respeitadas exatamente; a escala
  de cada anel é calculada pelo perímetro real do polígono.
- **Seção:** elipse achatada no punho (1,45 vezes mais larga que grossa), mais redonda perto do
  cotovelo (1,12), mais a saliência do músculo braquiorradial no lado do polegar.
- **UV de uma peça só:** u dá a volta no braço e v vai do punho ao cotovelo, seguindo a distância
  pelas costas do braço. A textura inteira fica para o antebraço: cerca de 0,13 mm por pixel em
  2048 px.
- **Costura no lado do mindinho**, o lugar menos tatuado. As normais são calculadas olhando os
  vizinhos dos dois lados da costura, então a luz não mostra linha ali.
- **Pontas arredondadas** fecham o punho e o cotovelo.
- **three-mesh-bvh** acelera o raycast. Com cerca de 47 mil triângulos, um raio caiu de 2,8 ms
  para 0,015 ms; sem isso, um traço rápido travaria, porque a pintura lança um raio por pixel.
- **Mudar as medidas refaz a malha** (no máximo uma vez por quadro). Como o UV é proporcional, a
  pintura acompanha a pele. Mudar as medidas não entra no histórico.

## Consequências

- O tatuador ajusta o braço ao cliente em segundos, sem modelagem 3D.
- O formato é "o de um antebraço médio": não tem ossos aparentes, veias nem dobras. Detalhes
  assim podem vir depois como relevo (mapa de normais) ou como um modelo esculpido que respeite
  o mesmo UV.
- Mudar as medidas depois de desenhar estica o desenho junto. O painel avisa para ajustar antes.
- Cada parte nova do corpo (braço, panturrilha, costas) vai precisar do seu gerador e do seu
  painel de medidas. O formato de malha (`MeshData`) e o resto do app não mudam.
- O carimbo (ADR 0007) agora estica nas laterais de um braço de verdade; enrolar sem esticar
  continua pendente.
