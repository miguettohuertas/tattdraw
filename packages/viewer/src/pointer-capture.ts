/**
 * "Captura" o ponteiro: enquanto a caneta estiver apertada, os eventos continuam chegando a este
 * elemento mesmo que ela saia de cima dele. Sem isso, um traço que passa da borda do canvas
 * perderia o "soltar" e ficaria preso.
 *
 * O navegador recusa a captura (lançando um erro) se o ponteiro já não estiver ativo, o que pode
 * acontecer em casos raros, como um toque cancelado pelo sistema no meio do caminho. A captura é
 * só uma ajuda: sem ela o traço funciona do mesmo jeito, então ignoramos a recusa.
 */
export function capturePointer(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Ponteiro já inativo: seguimos sem captura.
  }
}
