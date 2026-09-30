# Scheda Powerlifting – Notifiche push su Vercel

App web per la scheda di powerlifting con promemoria mattutino via push notification.

## 1. Genera le chiavi VAPID

```bash
npx web-push generate-vapid-keys
```

Copia **Public Key** e **Private Key**.

## 2. Carica su GitHub + Vercel

1. Crea un repo su GitHub e carica **tutta** questa cartella.
2. Vai su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo.
3. Deploy (lascia le impostazioni di default).

## 3. Collega Upstash Redis

1. In Vercel → progetto → **Storage** → **Marketplace** → **Upstash Redis** → Create.
2. Collegalo al progetto (Vercel imposta automaticamente `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`).

## 4. Variabili d'ambiente

Vercel → progetto → **Settings** → **Environment Variables** → aggiungi:

| Nome                 | Valore                                      |
|----------------------|---------------------------------------------|
| `VAPID_PUBLIC_KEY`   | la Public Key generata                      |
| `VAPID_PRIVATE_KEY`  | la Private Key generata                     |
| `VAPID_SUBJECT`      | `mailto:tua-email@esempio.com`              |
| `CRON_SECRET`        | una stringa lunga casuale (es. `openssl rand -hex 32`) |

Poi **Redeploy** il progetto.

## 5. Attiva le notifiche sul telefono

### iPhone (Safari)
1. Apri l’URL del sito in **Safari**.
2. Tocca **Condividi** → **Aggiungi alla schermata Home**.
3. Apri l’app dall’icona (non da Safari).
4. Vai su **Piano** → **Attiva notifiche** → consenti.
5. (Opzionale) **Invia notifica di prova**.

### Android (Chrome)
1. Apri l’URL in Chrome.
2. Menu → **Installa app** / **Aggiungi a Home**.
3. Apri l’app → **Piano** → **Attiva notifiche**.

## 6. Orario delle notifiche

I cron su Vercel Hobby girano **entro l’ora** indicata (UTC):

- `0 5 * * *` → 05:00 UTC = **07:00 CEST** (ora legale Italia)
- `0 6 * * *` → 06:00 UTC = **08:00 CEST**

Per un orario più preciso puoi usare [cron-job.org](https://cron-job.org):

- URL: `https://TUO-PROGETTO.vercel.app/api/cron?key=IL_TUO_CRON_SECRET`
- Ogni giorno alle 07:00, fuso **Europe/Rome**.

## Struttura file

```
├── index.html
├── script.js
├── style.css
├── coach.jpg
├── sw.js              ← Service Worker
├── manifest.json      ← PWA
├── package.json
├── vercel.json
└── api/
    ├── subscribe.js   ← salva subscription in Redis
    ├── cron.js        ← invia le notifiche
    └── vapid.js       ← espone la public key
```

## Test locale (opzionale)

```bash
npm install
npx vercel dev
```

(Serve comunque Redis e le env vars.)


## Hevy (opzionale)

1. Abbonamento **Hevy Pro**
2. API key: https://hevy.com/settings?developer
3. Su Vercel → Project → Settings → Environment Variables:
   - `HEVY_API_KEY` = la tua chiave
4. Redeploy
5. In allenamento compila **kg / rip / RPE** sotto ogni esercizio
6. A fine sessione: **Invia a Hevy**

Su Apple Watch, a inizio allenamento: **Allenamento → Forza** (per FC/calorie in Salute).
