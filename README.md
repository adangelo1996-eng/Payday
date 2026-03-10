# PAYDAY HR Cloud Enterprise (CH)

Piattaforma HR cloud enterprise per:
- timbratura entrata/uscita e presenze
- smartworking e accumuli mensili
- ferie e malattia con workflow approvativo
- organigramma dinamico e dipendenze gerarchiche
- cedolino svizzero automatico con area riservata

## Workspace

- `apps/api`: backend NestJS
- `apps/web`: frontend Next.js
- `packages/domain`: tipi dominio condivisi
- `packages/payroll-ch-rules`: motore regole payroll svizzere
- `infra`: docker, terraform, CI

## Quick start

1. Installare pnpm.
2. Eseguire `pnpm install`.
3. Eseguire `pnpm dev`.

## Note compliance CH

Le aliquote e le regole di calcolo sono versionate e parametrizzabili per:
- cantone
- sede aziendale
- tipologia di azienda
- anno fiscale
