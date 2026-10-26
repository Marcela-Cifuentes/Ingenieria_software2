/* ======================================================================
 * lab-core.js: código común de los laboratorios de patrones de diseño.
 * Cada laboratorio carga antes ../config.js y luego este archivo, y llama
 * LabCore.init('nombre-del-lab') al empezar.
 * Aquí NO hay respuestas: la calificación vive solo en el servidor.
 * ====================================================================== */
(function () {
  'use strict';
  const CFG = window.LAB_CONFIG || {};
  const LabCore = { lab: '' };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  /* ---------- arranque y estado del laboratorio ---------- */
  LabCore.init = function (lab) {
    LabCore.lab = lab;
    const info = (CFG.LABS || []).find(x => x.lab === lab);
    if (info && info.estado === 'cerrado') showClosed(info);
    return info || null;
  };
  function showClosed(info) {
    const d = document.createElement('div');
    d.setAttribute('role', 'alert');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;color:#1F2430;display:grid;place-items:center;text-align:center;padding:24px;font:16px/1.5 system-ui,sans-serif';
    d.innerHTML = '<div><h2 style="margin:0 0 8px">Laboratorio cerrado</h2><p>El laboratorio «' + String(info.nombre).replace(/[<>&]/g, '') +
      '» no está abierto en este momento. Consulta con tu docente.</p><p><a href="../">Volver a los laboratorios</a></p></div>';
    document.body.appendChild(d);
  }

  /* ---------- red ----------
   * Envía {op, lab, rid, ...data} al Apps Script. El rid es el mismo en los
   * reintentos: así el servidor no cuenta dos veces una solicitud repetida.
   * Devuelve la respuesta del servidor, o {s:0, e:'config'|'red'}. */
  LabCore.apiConfigured = () => !!CFG.API_URL && /^(https:\/\/|http:\/\/localhost[:/])/.test(CFG.API_URL) && !/PEGAR/.test(CFG.API_URL);
  LabCore.post = async function (op, data, opt) {
    opt = opt || {};
    if (!LabCore.apiConfigured()) return { s: 0, e: 'config' };
    const body = JSON.stringify(Object.assign({ op, lab: LabCore.lab, rid: uid() }, data || {}));
    let last = { s: 0, e: 'red' };
    for (let i = 0; i < 3; i++) {
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 30000);
        const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctl.signal });
        clearTimeout(to);
        const j = await r.json();
        if (!opt.retry || !opt.retry(j)) return j;
        last = j;
      } catch (e) { last = { s: 0, e: 'red' }; }
      if (i < 2) await sleep(700 * (i + 1));
    }
    return last;
  };

  /* ---------- arrastrar y soltar ----------
   * Eventos pointer: sirve igual con mouse, dedo y lápiz. Al moverse más de
   * 6 px aparece una copia ("fantasma") que sigue al puntero; al soltar sobre
   * una zona se llama o.drop(pieza, zona). Un toque sin moverse llama o.tap
   * (si no se define, el navegador dispara el click normal).
   * o = { chip: selector, zone: selector, canDrag(pieza), drop(pieza, zona), tap(pieza) } */
  LabCore.dnd = function (o) {
    let press = null, drag = null, over = null;
    document.addEventListener('pointerdown', e => {
      const c = e.target.closest && e.target.closest(o.chip);
      if (!c || (o.canDrag && !o.canDrag(c))) return;
      if (e.button !== undefined && e.button > 0) return;
      press = { c, x: e.clientX, y: e.clientY };
    });
    document.addEventListener('pointermove', e => {
      if (!press) return;
      if (!drag) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return;
        const g = press.c.cloneNode(true);
        g.classList.add('ghost'); g.classList.remove('sel');
        g.style.cssText += ';position:fixed;z-index:999;pointer-events:none;margin:0';
        document.body.appendChild(g);
        press.c.classList.add('src'); drag = { c: press.c, g };
      }
      e.preventDefault();
      drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
      const z = document.elementFromPoint(e.clientX, e.clientY), zone = z && z.closest(o.zone);
      if (over && over !== zone) over.classList.remove('over');
      over = zone; if (over) over.classList.add('over');
    }, { passive: false });
    function end(cancel) {
      if (!press) return;
      const p = press; press = null;
      if (drag) {
        const d = drag; drag = null; d.g.remove(); d.c.classList.remove('src');
        if (over) { over.classList.remove('over'); const z = over; over = null; if (!cancel) o.drop(d.c, z); }
        return true;
      }
      if (!cancel && o.tap) o.tap(p.c);
      return false;
    }
    document.addEventListener('pointerup', () => end(false));
    document.addEventListener('pointercancel', () => end(true));
  };

  /* ---------- medidas disuasivas ----------
   * No impiden una foto al monitor: solo disuaden y dejan registro. */
  LabCore.watermark = function (host, text, o) {
    o = Object.assign({ w: 360, h: 190, size: 15, fill: 'rgb(128,128,128)', opacity: 0.2, angle: -24 }, o || {});
    const t = String(text).replace(/[&<>"]/g, '');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + o.w + '" height="' + o.h + '"><text x="' + (o.w / 2) + '" y="' + (o.h / 2) +
      '" transform="rotate(' + o.angle + ' ' + (o.w / 2) + ' ' + (o.h / 2) + ')" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + o.size +
      '" font-weight="700" fill="' + o.fill + '" fill-opacity="' + o.opacity + '">' + t + '</text></svg>';
    host.style.backgroundImage = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  };
  /* Bloquea copiar, cortar, menú contextual, arrastrar texto, seleccionar,
   * imprimir y las teclas de herramientas de desarrollo. Cada intento llama onBlock(). */
  LabCore.antiCopy = function (onBlock) {
    const isField = t => { const n = t && (t.nodeType === 3 ? t.parentElement : t); return !!(n && n.closest && n.closest('input,textarea')); };
    const hit = () => { try { onBlock(); } catch (e) {} };
    ['copy', 'cut', 'contextmenu', 'dragstart'].forEach(ev => document.addEventListener(ev, e => { if (isField(e.target)) return; e.preventDefault(); hit(); }));
    document.addEventListener('selectstart', e => { if (!isField(e.target)) e.preventDefault(); });
    const clip = () => { try { navigator.clipboard.writeText('Captura no permitida'); } catch (_) {} };
    document.addEventListener('keydown', e => {
      const k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
      const bad = e.key === 'PrintScreen' || e.key === 'F12' || (c && e.shiftKey && ['i', 'j', 'c', 's', '3', '4', '5'].includes(k)) ||
        (c && !isField(e.target) && ['c', 'x', 'a', 'p', 's', 'u'].includes(k));
      if (bad) { e.preventDefault(); hit(); if (e.key === 'PrintScreen') clip(); }
    }, true);
    document.addEventListener('keyup', e => { if (e.key === 'PrintScreen') { hit(); clip(); } });
  };
  /* Avisa cuando la página se oculta (true) o vuelve a estar visible (false). */
  LabCore.onAway = function (fn) {
    window.addEventListener('blur', () => fn(true));
    window.addEventListener('focus', () => fn(false));
    document.addEventListener('visibilitychange', () => fn(document.visibilityState === 'hidden'));
  };

  /* ---------- informe PDF ----------
   * Flujo: se arma el informe como texto, se convierte cada página en imagen
   * (pdf.js) y se guarda un PDF cifrado que se puede imprimir pero no editar.
   * Si la conversión falla, se guarda la versión de texto, también cifrada.
   * Las librerías se cargan desde cdnjs solo cuando se pide el PDF. */
  const LIBS = {
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  };
  function loadScript(url) {
    return new Promise((ok, no) => {
      const prev = document.querySelector('script[src="' + url + '"]');
      if (prev) { if (prev.dataset.ok) return ok(); prev.addEventListener('load', ok); prev.addEventListener('error', () => no(new Error('lib'))); return; }
      const s = document.createElement('script'); s.src = url;
      s.onload = () => { s.dataset.ok = '1'; ok(); }; s.onerror = () => no(new Error('lib'));
      document.head.appendChild(s);
    });
  }
  const W = 595.28, H = 841.89;
  const rndPass = () => Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x => x.toString(16).padStart(2, '0')).join('');
  LabCore.pdf = {
    size: { W, H },
    async loadJsPdf() { await loadScript(LIBS.jspdf); if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error('jspdf'); return window.jspdf.jsPDF; },
    options(enc) {
      const o = { unit: 'pt', format: 'a4', compress: true };
      if (enc) o.encryption = { userPermissions: ['print', 'copy'], ownerPassword: rndPass(), userPassword: '' };
      return o;
    },
    async rasterize(textDoc) {
      await loadScript(LIBS.pdfjs);
      const lib = window.pdfjsLib; if (!lib) throw new Error('pdfjs');
      if (!lib.GlobalWorkerOptions.workerSrc) {
        try { const r = await fetch(LIBS.worker); if (!r.ok) throw 0; lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(await r.blob()); }
        catch (e) { lib.GlobalWorkerOptions.workerSrc = LIBS.worker; }
      }
      const pdf = await lib.getDocument({ data: new Uint8Array(textDoc.output('arraybuffer')) }).promise, imgs = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const pg = await pdf.getPage(p), vp = pg.getViewport({ scale: 2 });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: x, viewport: vp }).promise;
        imgs.push(c.toDataURL('image/jpeg', 0.86));
      }
      return imgs;
    },
    /* build(enc) devuelve un jsPDF con el informe; stamp(doc) escribe el pie
     * de página (con el código de entrega) como texto real en cada hoja. */
    async protect(build, stamp) {
      const J = await LabCore.pdf.loadJsPdf();
      const base = build(false);
      let out, mode = 'imagen';
      try {
        const imgs = await LabCore.pdf.rasterize(base);
        out = new J(LabCore.pdf.options(true));
        imgs.forEach((d, i) => { if (i) out.addPage(); out.addImage(d, 'JPEG', 0, 0, W, H, undefined, 'FAST'); });
      } catch (e) { out = build(true); mode = 'texto'; }
      if (stamp) stamp(out);
      out.__mode = mode;
      return out;
    },
    slug(name) {
      return String(name || 'estudiante').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'estudiante';
    }
  };

  window.LabCore = LabCore;
})();
