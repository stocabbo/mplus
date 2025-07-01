# Indicazioni per gli sviluppatori

Questo repository contiene una piccola applicazione PWA. Le linee guida per le modifiche sono:

- Il codice JavaScript utilizza indentazione di 2 spazi.
- Ogni nuova pagina o asset deve essere aggiunto all'elenco `ASSETS_TO_CACHE` di `service-worker.js`.
- La documentazione principale è `README.md` ed è redatta in italiano. Ogni nuova funzionalità deve essere descritta in questo file.
- L'app contiene un pannello di impostazioni che permette di personalizzare gli obiettivi di accumulo e la durata minima della pausa pranzo: se questi parametri cambiano occorre aggiornare il README.
- Non sono presenti test automatici obbligatori.
