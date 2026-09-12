# Indicazioni per gli sviluppatori

Questo repository contiene una piccola applicazione PWA. Le linee guida per le modifiche sono:

- Il codice JavaScript utilizza indentazione di 2 spazi.
- Ogni nuova pagina o asset deve essere aggiunto all'elenco `ASSETS_TO_CACHE` di `service-worker.js`.
- La documentazione principale è `README.md` ed è redatta in italiano. Ogni nuova funzionalità deve essere descritta in questo file.
- L'app contiene un pannello di impostazioni che permette di personalizzare gli obiettivi di accumulo e la durata minima della pausa pranzo: se questi parametri cambiano occorre aggiornare il README.
- Il pianificatore degli obiettivi è implementato in `planner.html` e `planner.js`: eventuali modifiche ai limiti, alle unità di misura, alle esclusioni o alle alternative proposte devono essere riportate nel README.
- Il piano attivo e lo storico condivisi tra home e pianificatore sono gestiti da `tracking.js`; mantenere retrocompatibili e validare i dati salvati in `localStorage`.
- Non è presente una suite di test automatici obbligatoria; `script.js` contiene comunque controlli leggeri con `console.assert` eseguiti nel browser.
- Prima di concludere una modifica, verificare almeno la sintassi dei file JavaScript interessati e, per cambiamenti funzionali, provare manualmente il flusso coinvolto.
