import { BODY_PART_ORDER, BODY_PARTS } from '@tattdraw/viewer';
import type { BodyPartId, LimbMeasurements, Viewer } from '@tattdraw/viewer';
import { getElement } from './dom';
import { setupDropdown } from './dropdown';
import { showToast } from './toast';

/** Ordem das medidas no painel. Os nomes mudam de parte para parte (veja `BODY_PARTS`). */
const KEYS: (keyof LimbMeasurements)[] = ['lengthCm', 'distalCm', 'peakCm', 'proximalCm'];

/** Formato brasileiro: "16 cm", "16,5 cm". */
function formatCm(value: number): string {
  return `${value.toLocaleString('pt-BR')} cm`;
}

/**
 * Painel "Corpo": escolher a parte do corpo e ajustar as medidas do cliente.
 *
 * Os controles de medida são os mesmos para todas as partes (comprimento e três
 * circunferências); só mudam os nomes, os limites e as explicações, que vêm de `BODY_PARTS`.
 * Assim, uma parte nova no pacote `@tattdraw/body` aparece aqui sem mudar este arquivo.
 */
export function setupBodyPanel(viewer: Viewer): () => void {
  const partsContainer = getElement<HTMLElement>('#body-parts');
  const fieldsContainer = getElement<HTMLElement>('#body-fields');
  const resetButton = getElement<HTMLButtonElement>('#body-reset');
  const detachDropdown = setupDropdown('#body-toggle', '#body-panel');

  // Um botão por parte do corpo.
  const partButtons = new Map<BodyPartId, HTMLButtonElement>();
  for (const id of BODY_PART_ORDER) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.part = id;
    button.textContent = BODY_PARTS[id].name;
    button.addEventListener('click', () => choosePart(id));
    partsContainer.append(button);
    partButtons.set(id, button);
  }

  // Um controle por medida. Os nomes e limites são preenchidos por `render`.
  const rows = new Map<
    keyof LimbMeasurements,
    { row: HTMLLabelElement; name: HTMLElement; input: HTMLInputElement; output: HTMLOutputElement }
  >();
  for (const key of KEYS) {
    const row = document.createElement('label');
    row.className = 'slider measure';

    const name = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `measure-${key}`;
    input.step = '0.5';
    const output = document.createElement('output');
    output.htmlFor.add(input.id);

    input.addEventListener('input', () => {
      const value = Number(input.value);
      output.textContent = formatCm(value);
      viewer.setMeasurements({ [key]: value });
    });

    row.append(name, input, output);
    fieldsContainer.append(row);
    rows.set(key, { row, name, input, output });
  }

  /** Redesenha o painel para a parte atual e as medidas dela. */
  const render = (): void => {
    const id = viewer.getBodyPart();
    const part = BODY_PARTS[id];
    const measurements = viewer.getMeasurements();

    for (const [partId, button] of partButtons) {
      button.setAttribute('aria-pressed', String(partId === id));
    }
    for (const [key, { row, name, input, output }] of rows) {
      const field = part.fields[key];
      row.title = field.hint;
      name.textContent = field.label;
      input.min = String(part.limits[key].min);
      input.max = String(part.limits[key].max);
      input.value = String(measurements[key]);
      output.textContent = formatCm(measurements[key]);
    }
  };

  const choosePart = (id: BodyPartId): void => {
    if (id === viewer.getBodyPart()) return;
    viewer.setBodyPart(id);
    render();
    showToast(`${BODY_PARTS[id].name}: cada parte guarda o seu próprio desenho.`);
  };

  resetButton.addEventListener('click', () => {
    viewer.setMeasurements(BODY_PARTS[viewer.getBodyPart()].defaults);
    render();
  });

  render();
  return detachDropdown;
}
