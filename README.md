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

## Setup Supabase

1. Crea un progetto su Supabase e copia:
   - `Project URL`
   - `service_role key` (Settings -> API)
2. Crea `apps/api/.env` partendo da `apps/api/.env.example`.
3. Login CLI: `pnpm supabase:login`
4. Link progetto cloud: `pnpm supabase:link` (ti chiede project ref e password DB)
5. Applica migration: `pnpm supabase:db:push`

Note:
- le migration sono in `infra/supabase/migrations`
- la configurazione CLI e' in `infra/supabase/config.toml`
- il backend usa Supabase solo se trova entrambe le env `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- se manca una delle due env, l'API usa fallback in-memory (utile solo per demo)

Quando hai i valori reali (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`):
1. aggiornali in `apps/api/.env`
2. aggiungili anche nel progetto Vercel API (`payday-api`) in `Environment Variables`
3. fai un nuovo deploy dell'API

## Deploy su Vercel (apps/web)

1. Login Vercel (una volta): `corepack pnpm dlx vercel login`
2. Collegare il progetto frontend: `pnpm vercel:link`
3. Sincronizzare le variabili ambiente in locale: `pnpm vercel:env:pull`
4. Deploy preview: `pnpm vercel:preview`
5. Deploy produzione: `pnpm vercel:prod`

Note:
- il deploy Vercel e' configurato per l'app Next.js in `apps/web`
- API/backend (`apps/api`) restano fuori dal deploy Vercel e vanno pubblicati separatamente
- configurare in Vercel le env necessarie dell'app web (es. endpoint API pubblica)

## Note compliance CH

Le aliquote e le regole di calcolo sono versionate e parametrizzabili per:
- cantone
- sede aziendale
- tipologia di azienda
- anno fiscale
