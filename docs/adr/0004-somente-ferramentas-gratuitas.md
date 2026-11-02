# 0004 — Somente ferramentas sem custo

- **Situação:** Aceita
- **Data:** 2026-11-02

## Contexto

O projeto não pode depender de serviços pagos.

## Decisão

| Necessidade              | Escolha                                                         | Custo                                                   |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------- |
| Código e bibliotecas     | TypeScript, three.js, Vite, Vitest, ESLint, Prettier, Capacitor | Gratuitos, código aberto                                |
| Repositório e CI         | GitHub + GitHub Actions                                         | Gratuito dentro das cotas do plano grátis               |
| Arquivos grandes         | Git LFS do GitHub                                               | Gratuito dentro da cota do plano grátis                 |
| Modelo do corpo          | MakeHuman (exportações CC0) ou modelo próprio                   | Gratuito                                                |
| Hospedagem da versão web | GitHub Pages (ou similar gratuito)                              | Gratuito                                                |
| Plano B de motor         | Unity Personal                                                  | Gratuito até US$ 200 mil/ano de receita e financiamento |

**Único custo inevitável para publicar:** a conta de desenvolvedor do Google Play cobra uma taxa
única de US$ 25. Testar no próprio tablet (instalando o APK) e publicar na web não custam nada.

## Consequências

- Nada de SMPL (licença comercial paga) nem de assets pagos sem autorização de distribuição.
- Confira as cotas do GitHub (Actions e LFS) nas páginas oficiais antes de subir muitos modelos.
