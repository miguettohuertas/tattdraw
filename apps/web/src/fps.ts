/**
 * Mede quadros por segundo e avisa uma vez por segundo.
 * Serve para a prova de conceito: comparar o desempenho do notebook com o do tablet.
 */
export function startFpsMeter(onUpdate: (fps: number) => void): () => void {
  let frames = 0;
  let windowStart = performance.now();
  let handle = 0;

  const tick = (now: number): void => {
    frames++;
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      onUpdate(Math.round((frames * 1000) / elapsed));
      frames = 0;
      windowStart = now;
    }
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(handle);
}
