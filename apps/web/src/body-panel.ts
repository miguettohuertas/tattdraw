import { DEFAULT_FOREARM, FOREARM_LIMITS } from '@tattdraw/viewer';
import type { ForearmMeasurements, Viewer } from '@tattdraw/viewer';
import { getElement } from './dom';
import { setupDropdown } from './dropdown';

/** Nome de cada medida na tela, na ordem em que aparecem no painel. */
const FIELDS: { key: keyof ForearmMeasurements; label: string; hint: string }[] = [
  { key: 'lengthCm', label: 'Comprimento', hint: 'Do punho à dobra do cotovelo' },
  { key: 'wristCm', label: 'Punho', hint: 'Circunferência logo acima do osso do punho' },
  { key: 'forearmCm', label: 'Antebraço', hint: 'Circunferência na parte mais grossa' },
  { key: 'elbowCm', label: 'Cotovelo', hint: 'Circunferência logo abaixo da dobra do cotovelo' },
];

/** Formato brasileiro: "16 cm", "16,5 cm". */
function formatCm(value: number): string {
  return `${value.toLocaleString('pt-BR')} cm`;
}

/**
 * Painel de medidas: o tatuador mede o braço do cliente com uma fita e passa os números aqui.
 *
 * Os controles são criados a partir de `FIELDS` e dos limites do pacote `@tattdraw/body`, para
 * o painel e o gerador do braço nunca discordarem dos valores aceitos.
 */
export function setupBodyPanel(viewer: Viewer): () => void {
  const fieldsContainer = getElement<HTMLElement>('#body-fields');
  const resetButton = getElement<HTMLButtonElement>('#body-reset');
  const detachDropdown = setupDropdown('#body-toggle', '#body-panel');

  const inputs = new Map<
    keyof ForearmMeasurements,
    { input: HTMLInputElement; output: HTMLOutputElement }
  >();

  for (const { key, label, hint } of FIELDS) {
    const row = document.createElement('label');
    row.className = 'slider measure';
    row.title = hint;

    const name = document.createElement('span');
    name.textContent = label;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `measure-${key}`;
    input.min = String(FOREARM_LIMITS[key].min);
    input.max = String(FOREARM_LIMITS[key].max);
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
    inputs.set(key, { input, output });
  }

  const show = (measurements: ForearmMeasurements): void => {
    for (const [key, { input, output }] of inputs) {
      input.value = String(measurements[key]);
      output.textContent = formatCm(measurements[key]);
    }
  };

  resetButton.addEventListener('click', () => {
    viewer.setMeasurements(DEFAULT_FOREARM);
    show(DEFAULT_FOREARM);
  });

  show(viewer.getMeasurements());
  return detachDropdown;
}
