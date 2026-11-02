// Configuração do ESLint (formato "flat config").
// O ESLint encontra erros prováveis no código; a formatação fica com o Prettier.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'apps/mobile/android/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Variáveis começando com _ podem ficar sem uso (útil em parâmetros obrigatórios).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Obriga "import type" para tipos, o que deixa claro o que some no build.
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['*.config.{js,ts}', 'apps/*/*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Sempre por último: desliga regras que brigariam com o Prettier.
  prettier,
);
