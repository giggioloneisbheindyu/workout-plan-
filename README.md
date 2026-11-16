# Aggiornamento progetto allenamento — 16 novembre 2026 (v. 20261116-4)

## Installazione

Sostituisci nella cartella del progetto i tre file `index.html`, `script.js` e `style.css` con quelli presenti in questo archivio. Prima dell'aggiornamento puoi scaricare il backup JSON dal Piano. Mantieni gli altri file del progetto, inclusi `sw.js`, `manifest.json`, immagini ed eventuali API: non erano fra gli allegati e questo archivio contiene soltanto l'aggiornamento.

Riapri l'app e ricarica la pagina. I riferimenti a JS e CSS hanno un numero di versione (`20261116-4`) per richiedere i file aggiornati. Se il service worker del progetto continua a mostrare una vecchia pagina, va verificata anche la sua strategia di aggiornamento: il suo codice non è stato fornito.

`originali/` contiene una copia dei tre file iniziali, per poter ripristinare il codice precedente.

## Modifiche applicate

| Area | Comportamento |
| --- | --- |
| Navigazione iPhone | Safe area, viewport dinamico e gestione tastiera; navigazione nascosta durante l'inserimento con tastiera aperta, per evitare che rimanga a metà schermo. |
| Note | A esercizio completato il blocco note (testo, foto, link e pianificazione del carico) diventa grigio e non modificabile; si sblocca annullando il completamento dell’esercizio. Alla sessione successiva dello stesso esercizio compaiono le note salvate l’ultima volta, come copia propria della sessione: puoi aggiornarle prima di completare l’esercizio senza cambiare quelle degli allenamenti passati. Nello Storico resta “Modifica note”. |
| MAV e back-off | Calcoli centralizzati e campi vincolati. Ogni percentuale del MAV usa il blocco MAV precedente pertinente; un valore mancante impedisce di segnare il back-off come eseguito. Le serie già eseguite mantengono i propri carichi. |
| Propagazione | Modificare i kg aggiorna le serie successive dello stesso blocco ancora collegate. Una modifica manuale interrompe la catena; le serie eseguite vengono preservate. Sx e Dx sono indipendenti. |
| Salvataggio | I carichi futuri vengono salvati anche senza spunta. Leggere un registro non ne tronca le serie. I valori preesistenti senza indicazione di origine vengono trattati con prudenza come manuali. |
| Timer | Associato alla serie/lato che lo ha avviato; togliere la spunta annulla quel timer, senza fermarne uno di un'altra serie. |
| Importazione | Possibilità di attivare la nuova scheda dopo il salvataggio della sessione in corso; scelta della settimana per i programmi nuovi. Gli aggiornamenti compatibili mantengono i dati. Le serie con prescrizione cambiata vengono conservate in un archivio consultabile dal Piano. |
| Blocchi | Conteggio e completamento usano le configurazioni effettive di tutti i blocchi, comprese le serie aggiunte e i due lati dei monolaterali. |
| Suggerimenti | I complementari mostrano rep/carico della medesima serie precedente. La spunta trasforma il suggerimento in dato reale. L'RPE suggerito rimane un target e non viene registrato automaticamente come RPE percepito. |
| Inizio esercizio | Banner con prima serie dell'ultima sessione e data. |
| Storico | Identificazione di blocco e serie, conservata nei nuovi salvataggi; i vecchi dati privi di metadati mostrano il numero della serie. Layout a colonne: identificazione (blocco, serie) a sinistra, kg × rip (@RPE) a destra; i ritorni a capo avvengono solo tra le parole, non più una lettera per riga. |
| Layout | Blocchi verticali, campi flessibili e recupero prima delle serie. Note e valori rimangono leggibili anche ad esercizio concluso. |
| Allenamenti passati | Modalità di inserimento senza avvio timer e senza spunte automatiche al tocco; registrazione con il pulsante di salvataggio. |
| PR | Badge di carico, carico a pari rep ed e1RM. Confronto per identità dell'esercizio e lato, sulle serie marcate eseguite. Epley fino a 12 rep; singola = carico reale. La prima prestazione è una base di confronto. |
| Settimana | Ogni lunedì, con la data locale del dispositivo, viene selezionata la settimana successiva del programma, indipendentemente dagli allenamenti completati (completare i giorni non cambia più settimana). Se l’app è chiusa, la selezione si aggiorna alla riapertura (una settimana per ogni lunedì trascorso); all’ultima settimana si ferma. Una sessione ancora aperta a cavallo della mezzanotte mantiene la sua settimana fino alla chiusura. Resta il messaggio di programma concluso a fine ultima settimana. |
| CSV Hevy | Pulsante dedicato nello Storico, in formato Strong, una riga per serie eseguita. I due lati vengono esportati separatamente, con il lato nelle note. È mantenuto anche il CSV originario dell'app. |
| Riepilogo | Riepilogo dei fondamentali dopo la scelta dell'allenamento, con pulsante per riaprirlo. |
| Recupero dimenticato | Promemoria nell'app dopo 120 secondi dall'inizio della sessione o dalla fine del recupero precedente, senza una nuova registrazione. Soglia configurabile e pulsanti per ignorarlo o rimandarlo. |
| Preferenze timer | Opzioni distinte per barra, pulsante Annulla, suono, notifica finale e promemoria. Annullamento sempre disponibile dal Piano. |
| Carico futuro | Testo “Modificare il carico”, campi più leggibili, salvataggio automatico e valori facoltativi diversi per Sx/Dx. Nella sessione successiva il valore compare come suggerimento verde dentro il campo kg di ogni serie (per i monolaterali Sx/Dx separati); la spunta della serie lo salva come carico effettivo, mentre un valore digitato a mano ha la precedenza. |
| Foto | Upload multiplo nelle note, compressione a JPEG fino a 1600 px, anteprima ed eliminazione. Foto in IndexedDB, riferimenti nel registro. Backup e ripristino JSON includono gli allegati. Per i video è previsto l'inserimento di un link. |

## Verifiche eseguite e limiti

- Controllo sintattico JavaScript superato: `node --check script.js`.
- Provato in un browser simulato (jsdom) con un programma di esempio: blocco e sblocco delle note, note ereditate con copia per sessione (la sessione passata resta invariata), suggerimento verde dei kg con spunta (anche Sx/Dx) e precedenza del valore digitato, cambio settimana del lunedì (stesso lunedì senza doppio avanzamento, app chiusa più settimane, ultima settimana, ora legale, sessione a cavallo della mezzanotte, primo avvio senza salti), struttura delle righe dello Storico.
- Non verificati: l’aspetto reale (colonne dello Storico, grigio del blocco note, verde del suggerimento) e il comportamento su Safari/PWA iPhone, perché non era disponibile un browser vero. Da controllare dopo l’installazione.
- Lo script `tests/regression.cjs` citato nell’aggiornamento precedente non era fra gli allegati e non è stato rieseguito.
- Le note delle sessioni già salvate non vengono modificate. La prima apertura dopo l’aggiornamento non sposta la settimana: da lì in poi il cambio segue i lunedì.
- Il promemoria dei due minuti è un avviso nell’app e al rientro, non una notifica garantita quando l’app è sospesa. I servizi push mattutini non sono stati modificati.
- Il timer di sistema iPhone richiede il comando “Recupero PL” già descritto nell’app. Disattivare il suono web non modifica il suono del timer di sistema.
- L’importazione del CSV generato non è stata provata su un account Hevy. Hevy supporta ufficialmente le esportazioni dirette da Strong e avverte che i CSV convertiti non sono ufficialmente supportati. Percorso: Profilo → Impostazioni → Esporta e importa dati → Import Strong CSV, con unità kg.

Riferimento Hevy: https://help.hevyapp.com/hc/en-us/articles/35687878672663-Importing-Strong-Data-into-Hevy
