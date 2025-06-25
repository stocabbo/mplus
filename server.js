const http = require('http');
const url = require('url');

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

function formatEFFRECACC(oreEff, acc) {
  const h = Math.floor(oreEff / 60);
  const m = oreEff % 60;
  const effStr = (h > 0 ? h + 'h' : '') + (m > 0 ? m + 'm' : '');
  const parts = [`EFF ${effStr}`];
  if (acc > 0) parts.push(`ACC ${acc} min`);
  return parts.length ? '(' + parts.join(', ') + ')' : '';
}

function calcolaGiornata(tipo, IN1) {
  const pausa = 30;
  const ingresso = Math.max(IN1, 465); // minimo 07:45
  const durata_teorica = tipo === 'corta' ? 360 : 540;
  const uscita_bp = ingresso + pausa + 361;

  let accumulo_dichiarato = tipo === 'corta' ? 20 : 0;
  const ritardo = Math.max(0, IN1 - 540);
  if (tipo === 'corta') accumulo_dichiarato += ritardo;

  const max_totale = 29;
  const accumulo_effettivo = Math.min(accumulo_dichiarato, max_totale);
  const target_eff = 360 + accumulo_effettivo;
  let uscita_strategica = ingresso + pausa + target_eff;
  let ore_eff_strategica = target_eff;

  let suggerimento = '';

  if (tipo === 'corta') {
    if (uscita_strategica > 1170) {
      uscita_strategica = 1170;
      ore_eff_strategica = uscita_strategica - ingresso - pausa;
      const accumulo = Math.max(0, ore_eff_strategica - durata_teorica);
      suggerimento = `⚠️ Chiusura 19:30: accumulo max ${accumulo} min.`;
    } else if (accumulo_dichiarato > max_totale) {
      const ecc = ore_eff_strategica - durata_teorica;
      suggerimento = '⚠️ Massimo 29 min raggiunto, accumulo ridotto.';
    } else {
      const ecc = ore_eff_strategica - durata_teorica;
      if (ecc > 0) {
        suggerimento = `⏱️ Esci alle ${minutesToTime(uscita_strategica)} per +${ecc} min.`;
      } else {
        suggerimento = '🍽️ Pausa di 30 min. Buono pasto ok.';
      }
    }
  } else {
    const uscita_normale = ingresso + pausa + durata_teorica;
    uscita_strategica = Math.min(uscita_normale - 30, 1170);
    ore_eff_strategica = uscita_strategica - ingresso - pausa;

    if (uscita_normale > 1170 || uscita_bp >= 1170) {
      suggerimento = '⚠️ Chiusura 19:30: pianifica un recupero.';
    } else if (ore_eff_strategica >= 510) {
      suggerimento = `↪️ Uscita normale ${minutesToTime(uscita_normale)} se vuoi evitare anticipo.`;
    } else {
      suggerimento = '🍽️ Pausa di 30 min. Buono pasto ok.';
    }
  }

  const ore_eff_bp = uscita_bp - ingresso - pausa;

  return {
    uscita_stimata: minutesToTime(uscita_bp) + ' ' + formatEFFRECACC(ore_eff_bp, 0),
    uscita_strategica: minutesToTime(uscita_strategica) + ' ' + formatEFFRECACC(ore_eff_strategica, Math.max(0, ore_eff_strategica - durata_teorica)),
    suggerimento
  };
}

http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/api') {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ora = parsed.query.ora;
  const tipo = parsed.query.tipo === 'lunga' ? 'lunga' : 'corta';
  const paragrafo = parsed.query.paragrafo === '1';

  if (!ora || !/^\d{2}:\d{2}$/.test(ora)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Parametro "ora" mancante o non valido (HH:MM)');
  }

  const result = calcolaGiornata(tipo, timeToMinutes(ora));
  const output = paragrafo
    ? `Uscita strategica: ${result.uscita_strategica}. ${result.suggerimento}`
    : result.uscita_strategica;

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(output);
}).listen(process.env.PORT || 3000, () => {
  console.log('Server avviato sulla porta', process.env.PORT || 3000);
});

