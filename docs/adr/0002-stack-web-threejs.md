# 0002 — Stack: TypeScript + three.js, empacotado com Capacitor

- **Situação:** Aceita (provisória até o fim da prova de conceito)
- **Data:** 2026-11-02

## Contexto

O TattDraw precisa rodar em tablet Android, celular Android e navegador. O núcleo é pintar com caneta
numa textura de alta resolução (4096 × 4096 px) colada num modelo 3D do corpo, e gravar vídeo do
resultado. O desenvolvimento é feito por uma pessoa, então uma única base de código pesa muito.

Opções avaliadas: Unity, Flutter (flutter_scene), React Native, Godot, Kotlin + Filament e
web (three.js) + Capacitor. A pesquisa completa está no documento "TattDraw — Pesquisa de
referências e stack".

## Decisão

- Linguagem: **TypeScript** no modo estrito.
- 3D: **three.js**, começando com WebGL 2 (WebGPU fica como otimização futura).
- Android: o mesmo app web empacotado com **Capacitor**.
- Build e servidor de desenvolvimento: **Vite**. Testes: **Vitest**.

## Consequências

- Uma base de código para web, Android e tablet.
- Risco principal: desempenho do WebView no Android varia por aparelho. A prova de conceito mede
  latência da caneta e fps num tablet real antes de confirmar esta decisão.
- **Plano B:** Unity (gratuito no plano Personal). O formato de projeto próprio (glTF + PNG + JSON)
  permite trocar o renderizador sem perder trabalho.
