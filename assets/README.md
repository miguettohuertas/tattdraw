# assets

Arquivos de arte usados pelo app: modelos do corpo (`.glb`), texturas e mapas de ambiente.

Tudo que é binário aqui dentro vai para o **Git LFS** (veja `.gitattributes` na raiz). O Git guarda só
uma referência pequena, e o arquivo real fica no armazenamento LFS.

Regras:

- Antes de adicionar um modelo, confira a licença dele e anote em `assets/LICENSES.md`.
- Modelos e texturas comprados para uso no Procreate **não** entram aqui sem autorização por escrito
  do autor para distribuição dentro de um app.
- Prefira `.glb` (glTF binário): é o formato que o three.js carrega mais facilmente.
