## Deploy backend NestJS (`apps/api`) su Render (usando Supabase come DB/Auth)

Questa guida ti spiega come mettere online il backend NestJS su Render in modo che il frontend (Vercel) possa di nuovo usare tutti gli endpoint `/api/...`, mantenendo **Supabase** come database e, se vuoi, come Auth.

> Nota: i file sono già predisposti per Render:
> - `apps/api/package.json` ha lo script `"start": "node dist/main.js"`.
> - `apps/api/src/main.ts` ascolta sulla porta `process.env.PORT` (o `API_PORT` se mancante).

---

## 1. Preparazione repository

1. Assicurati che il codice sia su GitHub (repo che hai già).
2. Verifica che la root del progetto sia `Payday` e che il backend sia in `apps/api`.

---

## 2. Crea il database + chiave service role in Supabase

Hai già:
- tabelle create con `infra/supabase/migrations/001_payday_hr_core.sql`,
- utenti demo nella tabella `users`,
- utenti Auth (email/password).

Ti servono due valori dalla dashboard Supabase:

1. **Project URL** → lo metterai in `SUPABASE_URL`.
2. **service_role key** → lo metterai in `SUPABASE_SERVICE_ROLE_KEY`.

Prendili da:
- Supabase → Settings → API.

---

## 3. Creazione servizio backend su Render

1. Vai su [render.com](https://render.com) e crea un account (puoi usare GitHub).
2. Clicca **New +** → **Web Service**.
3. Scegli il repo GitHub che contiene il progetto Payday.
4. Configura il servizio:
   - **Name**: ad esempio `payday-api`.
   - **Region**: EU se possibile (per latenza/compliance).
   - **Branch**: il branch principale (es. `main`).
   - **Root Directory**: `apps/api`
     - Questo è importante: dice a Render che il codice del servizio è nella cartella `apps/api`, non nella root del monorepo.
   - **Runtime**: Node.
   - **Build Command**:
     ```bash
     pnpm install && pnpm run build
     ```
     (se non usi `pnpm` localmente, puoi usare `npm install && npm run build`, ma nel repo è già previsto l’uso di `pnpm`).
   - **Start Command**:
     ```bash
     pnpm start
     ```
     (usa lo script `"start": "node dist/main.js"` che abbiamo aggiunto).
   - **Instance Type**: puoi iniziare con il piano free (se disponibile) per test.

5. Salva per passare alla configurazione delle variabili d’ambiente.

---

## 4. Variabili d’ambiente su Render (backend)

Nel servizio `payday-api` su Render, sezione **Environment Variables**, aggiungi:

- `CORS_ORIGIN`  
  - Valore: l’URL del frontend (Vercel).  
  - Esempio: `https://payday-web.vercel.app`
  - Puoi mettere più origini separandole con virgole:  
    `https://payday-web.vercel.app,http://localhost:3000`

- `AUTH_JWT_SECRET`  
  - Valore: una stringa lunga e random (puoi partire da quella del `.env.example` ma meglio una nuova).

- Password di demo (se vuoi mantenerle come sono):
  - `AUTH_ADMIN_PASSWORD=AdminPayday123!`
  - `AUTH_MANAGER_PASSWORD=ManagerPayday123!`
  - `AUTH_EMPLOYEE_PASSWORD=EmployeePayday123!`

- **Supabase**:
  - `SUPABASE_URL=https://<tuo-project>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=<service_role_key>`  
    - Attenzione: questa chiave è sensibile, va solo nel backend (Render), **mai** nel frontend.

Non serve impostare `PORT`: Render la imposta automaticamente; il codice usa `process.env.PORT`.

Puoi opzionalmente impostare anche:
- `API_PORT` (non necessario, è solo fallback).

---

## 5. Deploy e test del backend

1. Dopo aver salvato le env, Render avvierà automaticamente il **primo deploy**.
2. Al termine, nella pagina del servizio vedrai:
   - l’URL pubblico, es. `https://payday-api-xyz.onrender.com`.
3. Prova a chiamare l’endpoint root:
   - Apri in browser: `https://payday-api-xyz.onrender.com/`
   - Dovresti vedere un JSON come:
     ```json
     { "status": "ok", "service": "payday-api", "basePath": "/api" }
     ```
4. Verifica anche uno degli endpoint con Postman/cURL (es. `GET /api/users` dopo login, oppure `/api/health` se ne aggiungi uno).

---

## 6. Aggiornare il frontend (Vercel) per usare il backend su Render

Nel frontend (`apps/web`), l’URL base delle API è controllato da:
- env `NEXT_PUBLIC_API_BASE_URL`.

### 6.1. Ambiente locale (`.env.local` in `apps/web`)

In `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://payday-api-xyz.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://<tuo-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

> Nota: **senza `/api`** alla fine: il codice in `lib/api.ts` aggiunge `/api` se manca.

### 6.2. Ambiente Vercel (produzione)

Nel progetto Vercel del frontend:

1. Vai in **Settings → Environment Variables**.
2. Imposta (in Production e, se vuoi, in Preview):
   - `NEXT_PUBLIC_API_BASE_URL=https://payday-api-xyz.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL=https://<tuo-project>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>`
3. Salva e fai un nuovo deploy del frontend.

### 6.3. Comportamento atteso

- Login:
  - Resta su Supabase Auth (già configurato nel frontend).
- Dashboard:
  - Quando chiama `fetchPayslips`, `fetchAttendance*`, `fetchOrgChart`, ecc., queste funzioni useranno:
    - `NEXT_PUBLIC_API_BASE_URL` + `/api/...` → cioè il backend Nest su Render.
- Pagina `/payroll-calc`:
  - Usa `fetchCurrentUser` (ora basato su sessione locale) e poi `fetchUsers` / `generatePayslip` verso Render.

Se tutto è configurato correttamente, l’app dovrebbe comportarsi come prima, ma con:
- DB e Auth su Supabase,
- backend NestJS su Render,
- frontend su Vercel.

---

## 7. Passi successivi (miglioramenti)

Una volta che il setup base funziona:

1. **Health check dedicato**:
   - Puoi aggiungere un controller `/api/health` in Nest per monitorare lo stato del backend.
2. **Log & monitoring**:
   - Configura i log di Render (già inclusi) e, se necessario, inviali verso un sistema esterno.
3. **Hardening sicurezza**:
   - Ruotare regolarmente `AUTH_JWT_SECRET`.
   - Limitare gli IP di origine se necessario (tramite firewall o impostazioni Render Pro).

Questo file ti permette di ripetere il deploy del backend su Render (o aggiornarlo) da qualsiasi macchina, seguendo sempre gli stessi passi.

