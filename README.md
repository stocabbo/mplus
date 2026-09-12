# MPLUS - Documentazione Anonima

## Panoramica


MPLUS è una piccola applicazione web (PWA) per il calcolo dell'orario di uscita ottimale dal lavoro. L'interfaccia è in italiano e include una modalità "giornata corta" e "giornata lunga". Al caricamento l'app può operare offline grazie al Service Worker e al manifest che permette l'installazione su dispositivi mobili. Oltre all'orario di uscita, l'app suggerisce anche quando iniziare e terminare la pausa pranzo e consente di personalizzare i minuti extra tramite l'icona a forma di ingranaggio. L'ultimo ingresso e la tipologia di giornata vengono ricordati sul dispositivo per velocizzare gli utilizzi successivi.

## Azioni rapide e accessibilità

- **Adesso** imposta l'orario di ingresso sull'ora corrente con un solo tocco.
- **Condividi riepilogo** usa il pannello di condivisione del dispositivo; sui browser che non lo supportano copia il risultato negli appunti.
- Il pannello delle impostazioni può essere chiuso con il pulsante dedicato, con `Esc` o toccando lo sfondo; alla chiusura il focus torna al pulsante delle impostazioni.
- **Ripristina** riporta nel modulo i valori predefiniti, che diventano effettivi premendo **Salva**.
- L'interfaccia rispetta la preferenza di sistema per la riduzione delle animazioni e mantiene il supporto al tema scuro.

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
- `pausa_inizio` e `pausa_fine`: orari suggeriti per la pausa pranzo.
- `suggerimento`: messaggio per l'utente.

Il file `script.js` gestisce inoltre l'aggiornamento dinamico dei risultati e il countdown fino all'uscita strategica con eventuali notifiche.

## Modalità Offline

Il `service-worker.js` memorizza in cache le risorse di base, incluso il suono di avviso e l'immagine di avvio iOS. Se una richiesta fallisce, viene mostrata la pagina `offline.html`.

## Impostazioni Personalizzate

Attraverso l'icona a forma di ingranaggio è possibile definire:

- i minuti di extra da accumulare nella giornata corta (default 20);
- i minuti di anticipo/recupero nella giornata lunga (default 30);
- la durata minima della pausa pranzo (default 30, valori ammessi 20-120).

## Regole di Calcolo

- L'orario di ingresso conteggiato parte dalle 7:45; se si entra prima, i minuti precedenti non vengono considerati.
- L'uscita massima consentita è alle 19:30.
- Se la pausa pranzo è inferiore a 30 minuti, ai fini del computo vengono comunque sottratti 30 minuti di lavoro.
- Per maturare il buono pasto servono almeno 20 minuti di pausa nell'arco di 6h1min di lavoro effettivo e almeno 30 minuti di attività dopo il rientro.

Oltre ai calcoli di uscita, l'app indica l'orario consigliato per la pausa pranzo e per il rientro.

Le preferenze vengono salvate in locale e rimangono attive ai successivi avvii.

## Pianificatore degli obiettivi MPLUS

Il collegamento **Pianifica un obiettivo MPLUS** apre una schermata separata, così
il calcolo giornaliero rimane essenziale. Il pianificatore accetta un saldo
corrente facoltativo, inserito separatamente in ore e minuti per riportare senza
arrotondamenti anche eccedenze come 20 minuti. Se entrambi i campi sono vuoti il
saldo iniziale è zero. L'obiettivo è obbligatorio e l'orizzonte può essere
espresso in giorni o settimane. Saldo e obiettivo non possono superare le 4 ore
di eccedenza.

L'app propone fino a tre alternative: un piano rapido, uno equilibrato e uno
leggero. Ogni proposta distribuisce soltanto i minuti mancanti, non supera i 29
minuti al giorno e mostra un calendario con la data prevista di completamento.
Sabati e domeniche sono esclusi automaticamente. Ferie, giornate di smart
working e altre indisponibilità possono essere aggiunte manualmente e vengono
ricordate sul dispositivo quando l'archiviazione locale è disponibile. Aggiungere
o rimuovere un'esclusione aggiorna subito le alternative già visualizzate. Se le
giornate disponibili non bastano, il pianificatore calcola il primo intervallo
utile e propone un pulsante per impostarlo automaticamente in giorni. La pagina
registra inoltre il Service Worker anche quando viene aperta direttamente, così
da preparare l'utilizzo offline senza richiedere prima una visita alla home.

## Test

Alla fine di `script.js` sono presenti tre funzioni di test (`testCalcolaBP`, `testEstratti`, `testStrategico`). Eseguono brevi verifiche tramite `console.assert` quando la pagina viene caricata, aiutando a mantenere la logica coerente.

## Esecuzione Locale

Non sono richiesti ambienti di build particolari. È sufficiente un server statico (o l'apertura diretta di `index.html`) per utilizzare l'applicazione. Per l'installazione su dispositivi mobili, assicurarsi che il file `manifest.json` e il Service Worker siano correttamente serviti.

## Integrazione con Comandi Rapidi iOS


È possibile interrogare il sito tramite l'URL `quick.html` fornendo i parametri:

- `ora` (es. `08:30`). È consentito omettere lo zero iniziale (es. `8:30`)
- `tipo` (`corta` o `lunga`, opzionale, predefinito `corta`)
- `out` (`time` per ottenere solo l'uscita strategica oppure `all` per l'intero paragrafo)

Esempio: `https://stocabbo.github.io/mplus/quick.html?ora=08:30&out=all`

La pagina `quick.html` esegue i calcoli con JavaScript lato client. Se l'URL viene

recuperato con la sola azione "Ottieni contenuti dell'URL" si otterrà solo il
markup HTML privo del risultato. Per ottenere il testo finale ci sono due
possibilità:

1. Usare "Ottieni contenuti della pagina web" e poi "Ottieni testo da input". In
   questo modo gli script vengono eseguiti automaticamente e si riceve il testo
   calcolato.
2. Oppure aprire la pagina con "Mostra pagina web" (o "Apri URL" in Safari) e
   successivamente utilizzare "Esegui JavaScript su pagina web" per restituire
   `document.body.innerText`. Quest'ultima azione accetta soltanto un oggetto
   "Pagina web di Safari"; se collegata direttamente all'output testuale di
   "Ottieni contenuti della pagina web" comparirà l'errore di conversione da RTF.

Esempio di flusso minimale (senza azioni Safari aggiuntive):

1. "Ottieni contenuti della pagina web" con l'URL sopra indicato.
2. "Ottieni testo da input" per estrarre il risultato calcolato.

Se invece si preferisce eseguire manualmente lo script:

1. "Mostra pagina web" con l'URL di `quick.html`.
2. "Esegui JavaScript su pagina web" con `document.body.innerText`.

### Guida passo passo (ELI5)

Esempio con la sola azione "Ottieni contenuti della pagina web":

1. Apri l'app **Comandi Rapidi** su iPhone e tocca **+** per crearne uno nuovo.
2. Inserisci l'azione **Testo** e incolla l'URL di `quick.html` con i parametri desiderati (es. `https://stocabbo.github.io/mplus/quick.html?ora=08:30&out=all`).
3. Aggiungi l'azione **Ottieni contenuti della pagina web** collegandola al campo "Testo" dell'URL.
4. Inserisci **Ottieni testo da input** e infine **Mostra risultato**.

Se vuoi invece eseguire manualmente lo script JavaScript:

1. Dopo l'azione **Testo** aggiungi **Mostra pagina web** con l'URL.
2. A seguire, inserisci **Esegui JavaScript su pagina web** con `document.body.innerText`.
3. Concludi con **Mostra risultato** per visualizzare il testo.



## Note Aggiuntive

Le indicazioni qui riportate facevano riferimento a problemi ora risolti (doppio
manifest, `start_url` errato e commenti dei test). Il progetto è già aggiornato
di conseguenza.
