import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona num servidor web e dentro do app Android (Capacitor).
  base: './',
  server: {
    // Deixa o tablet na mesma rede Wi-Fi abrir o app pelo IP do computador.
    host: true,
  },
  build: {
    // Só o three.js já passa de 500 kB minificado (cerca de 140 kB com gzip).
    // Subimos o limite do aviso; dividir o pacote em partes fica para quando o app crescer.
    chunkSizeWarningLimit: 800,
  },
});
