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
- **quick.html**: endpoint minimale per integrazione con Comandi Rapidi di iOS.

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

## Integrazione con Comandi Rapidi iOS

È possibile interrogare il sito tramite l'URL `quick.html` fornendo i parametri:

- `ora` (es. `08:30`)
- `tipo` (`corta` o `lunga`, opzionale, predefinito `corta`)
- `out` (`time` per ottenere solo l'uscita strategica oppure `all` per l'intero paragrafo)

Esempio: `https://stocabbo.github.io/mplus/quick.html?ora=08:30&out=all`

La pagina `quick.html` esegue i calcoli con JavaScript lato client. Se l'URL viene
recuperato con la sola azione "Ottieni contenuti dell'URL" si riceverà solo il
markup HTML privo del risultato. Perché il Comando Rapido ottenga il testo finale
è necessario caricare la pagina con "Ottieni contenuti della pagina web" (che
esegue gli script) oppure usare "Esegui JavaScript su pagina web" e restituire
`document.body.innerText`.

Esempio di flusso minimale:

1. "Ottieni contenuti della pagina web" con l'URL sopra indicato.
2. "Esegui JavaScript su pagina web" con `document.body.innerText` come script.

### Guida passo passo (ELI5)

1. Apri l'app **Comandi Rapidi** su iPhone e tocca **+** per crearne uno nuovo.
2. Inserisci l'azione **Testo** e incolla l'URL di `quick.html` con i parametri desiderati (es. `https://stocabbo.github.io/mplus/quick.html?ora=08:30&out=all`).
3. Aggiungi l'azione **Ottieni contenuti della pagina web** collegandola al campo "Testo" dell'URL.
4. Subito dopo inserisci **Esegui JavaScript su pagina web** e scrivi `document.body.innerText`.
5. L'azione restituirà il testo finale; puoi mostrarlo con **Mostra risultato** o copiarlo negli appunti.


## Note Aggiuntive

Le indicazioni qui riportate facevano riferimento a problemi ora risolti (doppio
manifest, `start_url` errato e commenti dei test). Il progetto è già aggiornato
di conseguenza.

