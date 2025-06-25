# Instructions for Codex Agents

This repository is a small PWA in Italian with an optional Node server (`server.js`) that exposes an `/api` endpoint for iOS Shortcuts. When modifying the server or API-related files, run the following test commands to verify responses:

```bash
node server.js & pid=$!; sleep 1; curl -s "http://localhost:3000/api?ora=08:30&tipo=corta"; echo; curl -s "http://localhost:3000/api?ora=08:30&tipo=corta&paragrafo=1"; echo; kill $pid
```

These commands should return the strategic exit time and the full paragraph respectively.

No automated tests exist for the front-end files; manual review in a browser is sufficient.
