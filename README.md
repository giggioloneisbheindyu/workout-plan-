# Scheda Powerlifting

Web app installabile come PWA per consultare la scheda del coach, registrare serie e carichi, gestire i recuperi e conservare lo storico degli allenamenti.

Importa una scheda `.docx`, imposta i massimali e usa le quattro sezioni **Oggi**, **Piano**, **Programma** e **Storico**. La lettura del documento e la gestione degli allenamenti avvengono nel browser. Le API del progetto servono per le notifiche push.

Documentazione aggiornata il **17 novembre 2026**.

## Indice

- [Avvio rapido](#avvio-rapido)
- [Le quattro sezioni](#le-quattro-sezioni)
- [Importazione della scheda](#importazione-della-scheda)
- [Prescrizioni e blocchi](#prescrizioni-e-blocchi)
- [Registrazione dell’allenamento](#registrazione-dellallenamento)
- [Note, foto e link](#note-foto-e-link)
- [Carico per la prossima volta](#carico-per-la-prossima-volta)
- [Recuperi e timer iPhone](#recuperi-e-timer-iphone)
- [Storico e scambio dei dati](#storico-e-scambio-dei-dati)
- [Modifica della scheda](#modifica-della-scheda)
- [Salvataggio e backup](#salvataggio-e-backup)
- [Struttura e avvio locale](#struttura-e-avvio-locale)
- [Notifiche e pubblicazione](#notifiche-e-pubblicazione)
- [Aggiornamento dei file](#aggiornamento-dei-file)
- [Problemi frequenti](#problemi-frequenti)

## Avvio rapido

1. Apri l’app e carica la scheda del coach in formato `.docx`.
2. In **Piano**, inserisci i massimali di squat, panca e stacco in kg.
3. In **Oggi**, scegli allenamento o riposo; per allenarti seleziona il giorno della scheda.
4. Registra i valori richiesti e tocca le serie quando le completi.
5. Concludi l’allenamento per salvarlo nello **Storico** e aggiornare il **Piano**.
6. Da **Piano**, scarica periodicamente un backup `.json`, soprattutto prima di cambiare dispositivo o cancellare dati del browser.

Per installare l’app su iPhone, aprila in Safari e scegli **Condividi → Aggiungi alla schermata Home**. Su Android usa il comando di installazione del browser. Per le notifiche iPhone, apri l’app dalla sua icona.

## Le quattro sezioni

| Sezione | Contenuto |
| --- | --- |
| **Oggi** | Scelta allenamento/riposo, esercizi, serie, carichi, note e recuperi. |
| **Piano** | Massimali, preferenze, notifiche, timer iPhone, calendario settimanale, cambio scheda e backup. |
| **Programma** | Consultazione e modifica della scheda: giorni, matrice delle settimane, statistiche e strumenti. |
| **Storico** | Allenamenti e riposi raggruppati per scheda, dettagli delle serie, note ed esportazione/importazione CSV. |

### Piano e calendario

Ogni settimana ha sette caselle, da lunedì a domenica:

| Indicatore | Significato |
| --- | --- |
| Rosso con numero | Allenamento del giorno corrispondente della scheda. |
| Rosso con `C` | Complementari extra. |
| Rosso con spunta | Allenamento senza un giorno della scheda associato. |
| Blu con trattino | Riposo. |
| Grigio | Giorno non registrato. |

Tocca una settimana per selezionarla e un giorno per modificarlo. Puoi registrare un allenamento **con carichi e ripetizioni**, un allenamento **vuoto**, oppure un riposo. La registrazione di un allenamento passato non avvia i recuperi.

Il calendario viene ricostruito dallo storico: eliminare o importare una registrazione aggiorna anche gli indicatori. Il pulsante X di una settimana ne azzera le registrazioni dopo le conferme previste.

## Importazione della scheda

L’app legge i file Word `.docx` attraverso JSZip. **Il PDF non è un formato di importazione supportato.** JSZip viene caricato da cdnjs: deve essere disponibile una connessione per scaricare questa dipendenza.

### Struttura del documento

Usa tabelle Word con:

- una riga di intestazione con almeno due colonne di settimane, per esempio `SETT 1.1` e `SETT 1.2`;
- righe `GIORNO 1`, `GIORNO 2`, ecc. per separare i giorni;
- una riga per esercizio, con il nome nella prima colonna e la prescrizione nelle colonne delle settimane;
- un’unica cella di prescrizione se il testo deve valere per tutte le settimane.

Esempio:

| Esercizio | SETT 1.1 | SETT 1.2 |
| --- | --- | --- |
| GIORNO 1 | | |
| Squat | 5x3s 70% | 5x3s 72.5% |
| Curl manubri | 3x10 | 3x10 |

Le settimane vengono ordinate considerando la numerazione delle etichette. Controlla dopo l’importazione i giorni, i nomi e la classificazione degli esercizi.

### Riconoscimento e cambio scheda

L’app confronta nome del file ed esercizi con le schede conosciute. Se il riconoscimento è parziale, chiede se si tratta di un aggiornamento della stessa scheda oppure di una nuova.

Un aggiornamento mantiene il collegamento con la scheda esistente e può riapplicare le modifiche locali. Una nuova scheda riceve una propria identità. Lo storico delle schede precedenti viene conservato.

Gli esercizi vengono riconosciuti tramite nomi normalizzati e alias. Varianti o attrezzature differenti possono avere registri distinti: per esempio panca e panca presa stretta non sono automaticamente equivalenti.

## Prescrizioni e blocchi

Le percentuali dei fondamentali usano il relativo massimale, con arrotondamento dei carichi a **2,5 kg**. Percentuali riferite a MAV o ad altri valori seguono la prescrizione specifica.

| Notazione | Interpretazione |
| --- | --- |
| `5x3s` | 3 serie da 5 ripetizioni: con la `s` finale l’ordine è ripetizioni × serie. |
| `3x8` | 3 serie da 8 ripetizioni. |
| `70%` | Percentuale del massimale, quando applicabile. |
| `5@7` | 5 ripetizioni con obiettivo RPE 7. |
| `10-8-6-4` | Quattro serie con ripetizioni differenti. |
| `MAV` | Blocco di avvicinamento al carico MAV. |
| `istintiva` | Blocco libero secondo la notazione riconosciuta. |

Le prescrizioni composte vengono separate in blocchi. Per esempio:

```text
2x2s 70% + 5@7 + 70% no var istintiva 2x3s + istintiva
```

| Blocco | Comportamento previsto |
| --- | --- |
| `2x2s 70%` | Serie, ripetizioni e carico prescritti. |
| `5@7` | Ripetizioni prescritte, kg modificabili e serie adattabili dove consentito. |
| `70% no var istintiva 2x3s` | Blocco con ripetizioni e carico prescritti. |
| `istintiva` | Kg e ripetizioni liberi. |

Un carico che dipende da un MAV o top set richiede prima il valore del blocco di riferimento. L’RPE obiettivo della scheda non viene registrato automaticamente come RPE effettivamente percepito.

Il parser usa regole di riconoscimento: con testi insoliti controlla l’anteprima in **Programma**. Se non riconosce il numero di serie, può usare il valore predefinito di tre serie.

## Registrazione dell’allenamento

### Serie e completamento

Ogni serie ha una scheda con i valori da registrare. Toccarla la segna come eseguita e avvia il recupero; toccarla di nuovo annulla il completamento e la sblocca.

Il completamento dell’esercizio si aggiorna sia segnando le serie una alla volta sia toccando numero o intestazione dell’esercizio. In quest’ultimo caso, se mancano serie, viene chiesta conferma per completarle tutte.

Quando tutte le serie sono completate, **l’intero esercizio si attenua**, comprese le note. Le note della sessione completata non sono modificabili dal relativo campo; sbloccando l’esercizio puoi tornare a modificarle. Se annulli il completamento di una serie, l’esercizio torna incompleto.

### Campi modificabili

| Tipo | Kg | Ripetizioni |
| --- | --- | --- |
| Fondamentale con prescrizione fissa | Prescritti. | Prescritte. |
| Fondamentale con MAV/RPE | Modificabili secondo il blocco. | Fisse quando indicate. |
| Blocco dipendente da MAV/top set | Calcolati dal riferimento. | Secondo la prescrizione. |
| Complementare | Generalmente modificabili. | Generalmente modificabili, con eventuale obiettivo. |
| Monolaterale | Separati per lato. | Separate per lato. |

Nei complementari l’app può proporre valori dell’ultima esecuzione dello stesso esercizio, anche da una scheda diversa. I valori già inseriti non vengono sovrascritti dal riempimento automatico. I suggerimenti mostrati nei campi possono essere accettati quando completi la serie.

### Esercizi monolaterali

Ogni serie contiene **Sinistro** e **Destro**. Puoi completare un lato alla volta oppure tutta la serie con il pulsante dedicato. La serie è completa quando entrambi i lati sono fatti; anche lo storico mantiene i valori separati.

### Fine allenamento

Concludendo la sessione, l’app salva serie, carichi e note, aggiorna lo storico per esercizio e ricostruisce il Piano. Il completamento di tutti i giorni permette il passaggio alla settimana successiva; l’ultima settimana viene segnalata come conclusa.

Il comando per terminare comunque permette di chiudere anche una sessione incompleta. Un allenamento iniziato prima di mezzanotte può rimanere aperto fino a 12 ore ed essere associato al giorno di inizio.

## Note, foto e link

Ogni esercizio può contenere testo, foto e link HTTP/HTTPS, compresi collegamenti a video.

- **Testo:** viene salvato nella sessione dell’esercizio.
- **Foto:** usa **＋ Foto nelle note** e seleziona una o più immagini. Vengono compresse sul dispositivo, con lato massimo di 1600 pixel; il limite per il file originale è 25 MB.
- **Link:** usa **＋ Link video** oppure inserisci l’indirizzo nel testo. I collegamenti vengono mostrati anche come link cliccabili.
- **Visualizzazione foto:** tocca una miniatura per aprirla interamente dentro l’app. Usa **Chiudi**, tocca lo sfondo o premi Esc per tornare all’allenamento.

### Note delle settimane precedenti

Sotto l’esercizio, **Note degli allenamenti precedenti** raccoglie testo, link e foto delle sessioni salvate dello stesso esercizio. La registrazione più recente è aperta; le altre si possono espandere.

La sessione corrente e le settimane successive della stessa scheda sono escluse da questa raccolta. Le note precedenti restano associate alla loro registrazione: visualizzarle durante una nuova sessione non le copia nel nuovo campo di testo.

Foto e link sono consultabili anche nello **Storico**. Il pulsante **Modifica note** dello storico consente di aggiornare il testo di una registrazione passata.

## Carico per la prossima volta

Nei complementari puoi attivare **Modificare il carico la prossima volta?** e impostare:

- il prossimo carico in kg;
- carichi separati per sinistro e destro, quando previsti;
- una nota facoltativa.

L’impostazione viene salvata automaticamente nella sessione e, alla sua registrazione, associata allo storico dell’esercizio. Nella sessione successiva l’app consulta il piano presente nell’ultima esecuzione disponibile.

Il riquadro **Avevi programmato…** mostra il carico e l’eventuale nota. **Applica a tutte** è disposto sotto al testo e applica il valore alle serie modificabili non ancora completate.

## Recuperi e timer iPhone

Ogni esercizio ha un recupero personalizzabile: predefinito **2 minuti**, intervallo **15 secondi–10 minuti**. La durata viene ricordata per esercizio.

Il recupero parte dal pulsante dedicato oppure completando una serie o un lato monolaterale. La barra mostra esercizio e tempo rimanente; **Annulla** interrompe il recupero interno dell’app.

Nelle preferenze puoi gestire barra, pulsante di annullamento, suono, notifica, promemoria di recupero dimenticato e riepilogo iniziale. Il promemoria funziona mentre l’app è aperta e al rientro: non equivale a un timer di sistema in background.

### Timer di sistema su iPhone

Con l’opzione attiva in **Piano**, l’avvio del recupero richiama il comando rapido chiamato esattamente **Recupero PL**, passando la durata in secondi.

Configurazione essenziale in Comandi:

1. Crea un comando con nome **Recupero PL**.
2. Usa l’input del comando rapido come durata dell’azione di avvio timer.
3. Imposta l’unità in **secondi** e autorizza l’esecuzione quando richiesto.

**Annullare il recupero nell’app non annulla il timer iPhone e non richiama il comando rapido di arresto.** Per fermare il timer di sistema usa i controlli dell’iPhone. La vecchia diramazione del comando per input vuoto, se già presente, non viene richiamata da questo pulsante.

Il timer interno usa un orario di scadenza per riallineare il conto alla riapertura. Se è scaduto da oltre due minuti, viene scartato senza un avviso tardivo. Suono e notifiche del browser dipendono dai permessi e dalla gestione del background del dispositivo.

## Storico e scambio dei dati

### Visualizzazione

Gli allenamenti sono raggruppati per scheda, con quella attuale per prima. I dettagli restano **sempre aperti**: esercizi, serie, kg, ripetizioni, lati, note e foto.

La data è piccola, orizzontale e posizionata sopra al pulsante **X**. I riposi hanno una scheda dedicata. Le registrazioni vuote dal Piano sono indicate come prive del dettaglio serie.

L’eliminazione richiede conferma e aggiorna anche il Piano e il registro per esercizio.

### Registro per esercizio

Il registro degli esercizi è condiviso tra schede riconosciute e conserva fino a **50 sessioni per esercizio**. La riga **Volta scorsa** mostra l’esecuzione precedente, escludendo quella corrente.

Le sessioni della scheda sono identificate da programma, settimana e giorno; i dati delle serie in corso includono anche l’identità dell’esercizio. Schede diverse con gli stessi nomi di settimana non devono condividere accidentalmente i dati della sessione.

### Esportazione e importazione

| Formato | Uso |
| --- | --- |
| CSV storico dell’app | Esportazione delle serie e reimportazione in una scheda conosciuta. |
| CSV per Hevy, formato Strong | Trasferimento delle serie eseguite con valori registrati; l’importazione dipende dall’app di destinazione. |
| CSV Hevy/Strong per complementari extra | Lettura di una sessione esterna da registrare come complementari. |
| JSON di backup | Copia completa dello stato, comprese le foto. |
| DOCX | Esportazione del programma di allenamento. |

L’importazione dello storico richiede almeno `week`/`settimana`, `day`/`giorno` ed `exercise`, e deve corrispondere a una scheda presente nell’app. Puoi aggiungere registrazioni oppure sostituire lo storico; per sostituirlo, il CSV deve includere tutte le schede già presenti.

Il CSV nativo gestisce i valori separati dei monolaterali. Il CSV **non sostituisce il backup JSON**: non conserva la copia completa dello stato e delle foto.

### Complementari extra

Da **Oggi → Allenamento → Complementari**, oppure dal Piano, puoi registrare una sessione fuori scheda. La tabella raccoglie esercizio, serie, ripetizioni, kg e note, con possibilità di aggiungere o eliminare righe.

L’import CSV può leggere allenamenti Hevy, Strong o esportati dall’app; se contiene più sessioni, puoi scegliere quella da usare. Le righe consecutive dello stesso esercizio vengono raggruppate.

## Modifica della scheda

Le modifiche in **Programma** rimangono in una **bozza** fino a **Applica**. Oggi continua a usare il programma applicato.

| Area | Operazioni |
| --- | --- |
| Giorno | Modificare esercizi, prescrizioni, classificazione, note e ordine. |
| Matrice | Confrontare e modificare le prescrizioni tra settimane. |
| Statistiche | Consultare stime di volume e durata. |
| Strumenti | Copiare giorni/settimane, generare progressioni, applicare scarico, gestire versioni ed esportare. |

Nell’editor puoi scegliere l’ambito delle modifiche, aggiungere o rimuovere esercizi e costruire prescrizioni per blocchi. Gli strumenti consentono anche di duplicare o rinominare una scheda, crearne una vuota o ripristinare il programma del coach.

L’app mantiene la base originale del coach e versioni delle modifiche applicate. Reimportando un aggiornamento della stessa scheda, tenta di riapplicare le modifiche locali e chiede come gestire gli eventuali conflitti.

Le registrazioni completate restano storiche; i dati di sessione incompatibili con prescrizioni cambiate vengono conservati nell’archivio mostrato nelle preferenze. Le statistiche sono stime ricavate dalle notazioni riconosciute.

## Salvataggio e backup

I dati risiedono nel browser o nella PWA del dispositivo:

| Archivio | Contenuto |
| --- | --- |
| `localStorage`, chiave `powerapp_v1` | Schede, massimali, serie, storico, note testuali, riferimenti alle foto, piani di carico e preferenze. |
| IndexedDB, database `powerapp_media_v1` | Immagini delle note compresse sul dispositivo. |
| Server delle notifiche, se configurato | Sottoscrizioni push. |

Lo storico generale non viene troncato automaticamente a 100–200 allenamenti. Il registro sintetico per esercizio ha invece il limite di 50 sessioni; resta inoltre il limite di spazio disponibile nel browser.

Non è prevista una sincronizzazione automatica degli allenamenti tra dispositivi. Cambiare dominio, profilo browser o dispositivo richiede un trasferimento tramite backup.

### Creare e ripristinare un backup

**Piano → Scarica backup dati (.json)** produce `powerlifting-backup-YYYY-MM-DD.json` con stato e immagini incorporate. Il backup corrente usa `backupVersion: 3`.

**Piano → Ripristina backup (.json)** richiede conferma e sostituisce lo stato attuale con quello del file. Le immagini vengono ripristinate con nuovi identificatori per evitare di sovrascrivere quelle esistenti durante il trasferimento. I popup non vengono riaperti dal backup.

Se una foto necessaria manca dall’archivio locale, l’esportazione segnala l’errore. Se il download non riesce dalla PWA, prova ad aprire il sito nel browser che contiene i dati e ripeti il backup.

Cancellare i dati del sito elimina anche gli archivi locali. Prima di farlo, scarica un backup completo. In caso di spazio esaurito, l’app mostra un avviso di salvataggio.

### Migrazione dei dati precedenti

Il passaggio allo schema v2 migra il vecchio registro degli esercizi, le chiavi delle sessioni e i tempi di recupero. Prima della migrazione può essere proposto un backup. Lo schema dello stato e la versione del formato di backup sono due numerazioni distinte.

## Struttura e avvio locale

Il frontend non richiede una compilazione: HTML, CSS e JavaScript sono serviti come file statici.

| File o directory | Ruolo |
| --- | --- |
| `index.html` | Pagina iniziale, caricamento di script/stile e registrazione del service worker. |
| `script.js` | Import, interfaccia, allenamenti, parser, note, foto, timer, editor e scambio dati. |
| `style.css` | Layout, temi e adattamento ai dispositivi. |
| `manifest.json` | Metadati per l’installazione PWA. |
| `sw.js` | Gestione delle notifiche e della loro apertura, secondo la configurazione del progetto. |
| `coach.jpg` | Immagine e icona richiamate dall’app. |
| `api/vapid.js` | Endpoint della chiave pubblica push. |
| `api/subscribe.js` | Gestione delle sottoscrizioni push. |
| `api/cron.js` | Invio dei promemoria dal server. |
| `package.json`, `vercel.json` | Dipendenze e configurazione del progetto completo. |

Il pacchetto delle correzioni frontend contiene `index.html`, `script.js` e `style.css`: gli altri file vanno conservati dal progetto originale.

### Solo interfaccia

Nella cartella con i file dell’app:

```bash
python3 -m http.server 8000
```

Apri `http://localhost:8000`. Le API push non sono fornite da questo server statico. Per la lettura DOCX serve anche il caricamento di JSZip.

### Progetto completo

Se hai anche `package.json`, API e configurazione Vercel:

```bash
npm install
npx vercel dev
```

Per le API servono le relative variabili d’ambiente. L’installabilità PWA non garantisce il funzionamento offline: questo dipende dalle strategie di cache effettivamente presenti in `sw.js`.

## Notifiche e pubblicazione

Da **Piano** puoi attivare/disattivare le notifiche ed eseguire una prova. Il client usa `/api/vapid` e `/api/subscribe`; l’invio pianificato richiede il backend del progetto e un servizio di pianificazione configurato.

La configurazione del progetto completo descritta nel README precedente utilizza Vercel, Web Push e Redis/Upstash. Prima del deploy verifica i file server e i nomi delle variabili richiesti dalla versione del backend in uso.

| Variabile | Uso previsto nel progetto |
| --- | --- |
| `VAPID_PUBLIC_KEY` | Chiave pubblica Web Push. |
| `VAPID_PRIVATE_KEY` | Chiave privata Web Push, solo server. |
| `VAPID_SUBJECT` | Contatto del mittente, per esempio un indirizzo `mailto:`. |
| `CRON_SECRET` | Protezione dell’endpoint dei promemoria. |
| Variabili Redis/Upstash | Accesso all’archivio delle sottoscrizioni, secondo il backend. |

L’orario effettivo dei promemoria dipende dalla configurazione del cron. Non è fissato dal solo frontend. Le pianificazioni UTC richiedono attenzione al passaggio tra ora solare e ora legale italiana.

Toccando una notifica, i parametri `?prompt=1` o `?from=notif` permettono al client di aprire la scelta del giorno. Il popup può comparire anche al primo accesso della giornata se questa non è stata registrata.

Le sottoscrizioni push non costituiscono un account di sincronizzazione degli allenamenti.

## Aggiornamento dei file

1. Scarica un backup dei dati dall’app.
2. Estrai il pacchetto e sostituisci i file frontend con i nomi **`index.html`**, **`script.js`** e **`style.css`**.
3. Conserva manifest, service worker, immagini, API e configurazione già presenti nel progetto.
4. Pubblica l’aggiornamento e ricarica l’app.

Le versioni nei riferimenti `script.js?v=…` e `style.css?v=…` aiutano a richiedere i file aggiornati. Per mantenere l’accesso ai dati locali usa lo stesso indirizzo e lo stesso ambiente browser/PWA.

## Problemi frequenti

| Problema | Controllo o soluzione |
| --- | --- |
| Il documento non viene importato | Usa `.docx` e verifica tabelle, intestazioni SETT e righe GIORNO. |
| JSZip non è disponibile | Controlla la connessione e l’accesso al CDN. |
| Il carico non viene calcolato | Controlla classificazione, massimale e riferimento della percentuale. |
| Un blocco dipendente non si completa | Registra prima il MAV o il top set da cui dipende. |
| Oggi mostra ancora la vecchia prescrizione | Applica la bozza in Programma. |
| Le note precedenti non compaiono | Verifica che l’allenamento sia salvato e l’esercizio riconosciuto; la sessione corrente e le settimane future della stessa scheda sono escluse. |
| Una foto non è disponibile | Serve il database immagini del dispositivo oppure un backup completo con le foto. Il CSV non le contiene. |
| Il timer iPhone continua dopo Annulla | È il comportamento previsto: fermalo dai controlli di sistema dell’iPhone. |
| Il recupero del browser non suona in background | Controlla permessi e volume; su iPhone configura il timer di sistema. |
| I dati non compaiono su un altro dispositivo | Trasferiscili con il backup JSON. |
| Gli indicatori del Piano sembrano errati | Controlla le registrazioni nello Storico, da cui il Piano viene ricostruito. |
| L’interfaccia mostra ancora la versione precedente | Ricarica l’app e verifica di aver pubblicato insieme HTML, script e CSS aggiornati. |
| Compare un avviso di spazio esaurito | Scarica il backup prima di cancellare dati o effettuare altre modifiche. |
| Le notifiche non funzionano | Verifica permessi, apertura dalla Home su iPhone e configurazione delle API. |

## Verifica delle modifiche

Per una verifica funzionale controlla importazione DOCX, completamento singolo e totale degli esercizi, monolaterali, sblocco, note nelle settimane successive, apertura foto, annullamento del recupero, backup/ripristino e import/export CSV.

Il README precedente elencava una suite nella cartella `tests/`. Se presente nel repository completo, consulta il relativo `tests/README-TEST.md` per dipendenze e comandi. Questo documento non certifica l’esecuzione di quella suite né risultati numerici dei test.
