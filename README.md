# Scheda Powerlifting

App web (PWA) per gestire la scheda del coach: visualizzazione leggibile, progressi settimanali, log dei complementari, timer di recupero e promemoria mattutini.

---

## Cosa fa

| Funzione | Descrizione |
|----------|-------------|
| **Scheda dal coach** | Carichi un file `.docx` con le tabelle SETT / GIORNO |
| **Kg dai massimali** | Converti automaticamente le % in kg (squat, panca, stacco) |
| **Oggi** | Scegli riposo o allenamento; checklist esercizi |
| **Settimana Lun–Dom** | 7 pallini: rosso = allenamento, blu = riposo |
| **Complementari** | Log kg/rip + storico nel tempo |
| **Timer recupero** | Per ogni esercizio (no riscaldamento), secondi personalizzabili |
| **Popup giornaliero** | Al primo accesso del giorno o al tap sulla notifica |
| **Notifiche push** | Promemoria ~7:00 (Vercel + Upstash Redis) |
| **Tema chiaro/scuro** | Segue le preferenze del sistema |

---

## Struttura del progetto

```
├── index.html          # Shell HTML + PWA meta
├── script.js           # Logica app (scheda, UI, log, timer)
├── style.css           # Stili
├── coach.jpg           # Immagine motivazionale in home
├── sw.js               # Service Worker (push + offline leggero)
├── manifest.json       # Installazione “Aggiungi a Home”
├── package.json        # Dipendenze Node (web-push, Upstash)
├── vercel.json         # Cron e header SW
├── README.md
└── api/
    ├── subscribe.js    # Salva/rimuove subscription push
    ├── cron.js         # Invia le notifiche programmate
    └── vapid.js        # Espone la VAPID public key al client
```

---

## Deploy su Vercel (produzione)

### 1. Repository

1. Crea un repo GitHub e carica **tutta** questa cartella.
2. [vercel.com](https://vercel.com) → **Add New Project** → importa il repo.
3. Deploy con le impostazioni di default.

### 2. Upstash Redis (per le notifiche)

1. Nel progetto Vercel → **Storage** → **Marketplace** → **Upstash** (Redis o KV).
2. Collegalo al progetto.
3. Verifica che compaiano variabili tipo:
   - `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL`
   - `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN`

Il codice accetta entrambi i prefissi.

### 3. Chiavi VAPID

In locale (o su un PC):

```bash
npx web-push generate-vapid-keys
```

Copia **Public Key** e **Private Key**.

### 4. Environment Variables

Vercel → progetto → **Settings** → **Environment Variables** (Production):

| Nome | Valore |
|------|--------|
| `VAPID_PUBLIC_KEY` | Public Key generata |
| `VAPID_PRIVATE_KEY` | Private Key generata |
| `VAPID_SUBJECT` | `mailto:tua-email@esempio.com` |
| `CRON_SECRET` | Stringa lunga casuale (es. `openssl rand -hex 32`) |

Poi **Redeploy**.

### 5. Installa l’app sul telefono

**iPhone (Safari)**  
1. Apri l’URL del sito in Safari.  
2. Condividi → **Aggiungi alla schermata Home**.  
3. Apri **dall’icona** (non dalla tab Safari).  
4. **Piano** → **Attiva notifiche** → consenti.

**Android (Chrome)**  
1. Apri l’URL → menu → **Installa app** / Aggiungi a Home.  
2. **Piano** → **Attiva notifiche**.

### 6. Orario notifiche

I cron in `vercel.json` (Hobby = “entro quell’ora” UTC):

| Cron | UTC | Italia (CEST, legale) |
|------|-----|------------------------|
| `0 5 * * *` | 05:00 | ~07:00 |
| `0 6 * * *` | 06:00 | ~08:00 |

Per un orario fisso alle 7:00 Europe/Rome puoi usare [cron-job.org](https://cron-job.org):

```
https://TUO-PROGETTO.vercel.app/api/cron?key=IL_TUO_CRON_SECRET
```

---

## Uso quotidiano

### Home – Oggi
- Compare la **data** e, se non hai ancora risposto, la domanda “Che giorno è oggi?”.
- **Riposo** o **Allenamento** (poi scegli Giorno 1/2/3… o **Complementari** extra).
- Popup sfocato al **primo accesso del giorno** o aprendo dalla **notifica**.

### In allenamento
- Tocca un esercizio per segnarlo fatto (✓).
- **Fondamentali** (squat / panca / stacco e varianti riconosciute): kg dalle % e dai massimali in Piano.
- **Complementari**: inserisci **kg** e **rip**; sotto vedi lo **storico** delle sessioni precedenti.
- **Timer recupero** (non sul riscaldamento): avvia con ⏱; i secondi sono modificabili per esercizio.

### Piano
- Massimali squat / panca / stacco.
- Notifiche on/off e prova.
- Settimane con **Lun–Dom**: tocca un giorno per impostare allenamento (con scelta del giorno scheda), riposo o cancella.
- Cambio file `.docx` della scheda.

---

## Formato scheda (.docx)

Il parser cerca tabelle Word con:

- Intestazioni tipo **SETT 0.1**, **SETT 1.2**, …
- Righe **GIORNO 1**, **GIORNO 2**, …
- Prima colonna = nome esercizio; colonne successive = testo per ogni settimana

Nomi che contengono squat / panca / stacco (e simili) vengono classificati come fondamentali per i kg %.

> I **PDF non sono supportati**: converti in `.docx` oppure chiedi il file Word al coach.

---

## Dati salvati (solo sul dispositivo)

Tutto resta in `localStorage` del browser/PWA:

- Massimali, settimana corrente, checklist
- Log settimana Lun–Dom
- Log complementari e storico carichi
- Secondi di recupero per esercizio
- Preferenza notifiche

Cancellare i dati del sito = azzerare progressi su quel dispositivo.

Le **subscription push** stanno su Redis (server), non nel telefono in chiaro oltre alla subscription Web Push.

---

## Sviluppo locale

```bash
npm install
npx vercel dev
```

Servono comunque le variabili d’ambiente (anche in `.env`) e Redis se testi le push.

Per solo UI/scheda, puoi anche aprire i file statici con un server locale, ma le API `/api/*` richiedono Vercel (o un setup Node equivalente).

---

## Risoluzione problemi

| Problema | Cosa controllare |
|----------|------------------|
| Non seleziona il file | Solo `.docx`, non PDF |
| “Nessuna tabella con settimane” | Struttura SETT/GIORNO nel Word |
| Notifiche iPhone | App aggiunta a Home + aperta dall’icona |
| Cron non parte | `CRON_SECRET`, Redis, log Functions su Vercel |
| Timer non si sente | Vibrazione solo su device che la supportano; tieni lo schermo attivo |

---

## Licenza / note

Progetto personale per uso con la scheda del coach.  
Nessuna integrazione a servizi a pagamento di log allenamento (Hevy, ecc.): lo storico dei complementari è nell’app; FC/calorie restano su Apple Watch → Salute se le attivi lì.
