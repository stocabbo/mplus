# MPLUS - Documentazione Anonima

## Panoramica

MPLUS è una piccola applicazione web (PWA) per il calcolo dell'orario di uscita ottimale dal lavoro. L'interfaccia è in italiano e include una modalità "giornata corta" e "giornata lunga". Al caricamento l'app può operare offline grazie al Service Worker e al manifest che permette l'installazione su dispositivi mobili.

## Struttura del progetto

- **index.html**: pagina principale con gli input per l'ora di ingresso, il selettore della tipologia di giornata e l'inclusione degli script.
- **script.js**: logica di calcolo dell'orario, gestione del countdown, notifiche e semplici test automatici in `console.assert`.
- **style.css**: stili dell'interfaccia con supporto al tema scuro e animazioni.
- **service-worker.js**: caching delle risorse per l'utilizzo offline.
- **manifest.json**: definizione del manifest PWA (icone, colori, `start_url`, ecc.).
- **offline.html**: pagina visualizzata in assenza di connettività.

## Funzionamento Principale

La funzione `calcolaGiornata(tipo, IN1)` riceve il tipo di giornata ("corta" o "lunga") e l'orario di ingresso in minuti. Restituisce un oggetto con:

- `uscita_stimata`: orario minimo per ottenere il buono pasto e relativo accumulo/recupero.
- `uscita_strategica`: orario consigliato per ottenere il massimo accumulo nel rispetto dei limiti.
- `suggerimento`: messaggio per l'utente.

Il file `script.js` gestisce inoltre l'aggiornamento dinamico dei risultati e il countdown fino all'uscita strategica con eventuali notifiche.

## Modalità Offline

Il `service-worker.js` memorizza in cache le risorse di base. Se una richiesta fallisce, viene mostrata la pagina `offline.html`.

## Test

Alla fine di `script.js` sono presenti tre funzioni di test (`testCalcolaBP`, `testEstratti`, `testStrategico`). Eseguono brevi verifiche tramite `console.assert` quando la pagina viene caricata, aiutando a mantenere la logica coerente.

## Esecuzione Locale

Non sono richiesti ambienti di build particolari. È sufficiente un server statico (o l'apertura diretta di `index.html`) per utilizzare l'applicazione. Per l'installazione su dispositivi mobili, assicurarsi che il file `manifest.json` e il Service Worker siano correttamente serviti.

## Note Aggiuntive

Le indicazioni qui riportate facevano riferimento a problemi ora risolti (doppio
manifest, `start_url` errato e commenti dei test). Il progetto è già aggiornato
di conseguenza.


## Integrazione Comandi Rapidi iOS

Per usare MPLUS nei Comandi Rapidi esistono due possibilita'.

### Pagina statica
Richiama `shortcut.html` direttamente dal tuo comando rapido, senza server.
Esempi:
https://<sito>/mplus/shortcut.html?ora=08:30&tipo=corta
https://<sito>/mplus/shortcut.html?ora=08:30&tipo=corta&paragrafo=1

Parametri:
- `ora` (obbligatorio) nel formato `HH:MM`.
- `tipo` opzionale (`corta` o `lunga`, default `corta`).
- `paragrafo=1` restituisce anche il testo di suggerimento.

Per creare il comando rapido:
1. Apri l'app **Comandi** e crea un nuovo comando.
2. Aggiungi **Chiedi testo** per l'ora di ingresso.
3. Inserisci **Ottieni contenuti da URL** con l'indirizzo `https://<sito>/mplus/shortcut.html?ora=[Risultato di Chiedi testo]&tipo=corta`.
4. (Facoltativo) aggiungi `&paragrafo=1` per mostrare il testo completo.
5. Termina con **Mostra risultato**.

### API opzionale
Se preferisci un server, puoi usare il vecchio file `server.js` ed esporre l'endpoint /api con gli stessi parametri. Non e' necessario per l'uso comune.
Esempio:
GET /api?ora=08:30&tipo=corta => "15:28 (EFF 6h20m, ACC 20 min)"

```bash
node server.js
```

L'endpoint restituisce testo semplice UTF-8 ed e' compatibile con la stessa configurazione dei Comandi Rapidi.
