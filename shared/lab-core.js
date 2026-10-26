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
   * Eventos pointer: sirve igual con mouse, dedo y lápiz.
   * - Solo se arrastran PIEZAS: elementos que cumplen o.chip y además tienen el
   *   atributo data-pieza. Botones, enlaces, campos y demás controles nunca
   *   inician un arrastre (salvo que el control sea la propia pieza).
   * - Al moverse más de 6 px aparece una copia que sigue al puntero; al soltar
   *   sobre una zona se llama o.drop(pieza, zona). Un toque sin moverse llama
   *   o.tap(pieza) (si no se define, el navegador dispara el click normal).
   * - La copia y la pieza de origen usan clases propias del motor (lc-arrastre,
   *   lc-origen) con estilos propios, para no chocar con las clases de cada
   *   laboratorio.
   * - El estado se limpia SIEMPRE: al soltar, al cancelar el gesto, al perder la
   *   captura del puntero, al salir de la ventana, al ocultarse la página, con
   *   Escape, si el puntero vuelve sin botón apretado, si la pieza desaparece o
   *   se oculta, y al cambiar de misión (LabCore.soltarArrastre()).
   * o = { chip: selector, zone: selector, canDrag(pieza), drop(pieza, zona), tap(pieza) } */
  const CONTROLES = 'a[href],button,input,select,textarea,label,summary,[contenteditable=""],[contenteditable="true"],[role="button"],[role="link"],[role="tab"],[role="checkbox"],[role="radio"]';
  let activo = null;          // { o, c, id, x, y, g, over }
  let tragarClic = 0;
  function estilosMotor() {
    if (document.getElementById('lc-estilos')) return;
    const st = document.createElement('style');
    st.id = 'lc-estilos';
    st.textContent = '.lc-arrastre{position:fixed!important;z-index:2147483000!important;pointer-events:none!important;margin:0!important;' +
      'transform:translate(-50%,-60%) rotate(-2deg)!important;box-shadow:0 12px 28px rgba(0,0,0,.3)!important;opacity:.95!important;transition:none!important;animation:none!important}' +
      '.lc-origen{opacity:.35!important}';
    (document.head || document.documentElement).appendChild(st);
  }
  function limpiar() {
    const a = activo; activo = null;
    document.querySelectorAll('.lc-arrastre').forEach(n => n.remove());
    document.querySelectorAll('.lc-origen').forEach(n => n.classList.remove('lc-origen'));
    if (!a) return null;
    if (a.over) a.over.classList.remove('over');
    try { if (a.c.hasPointerCapture && a.c.hasPointerCapture(a.id)) a.c.releasePointerCapture(a.id); } catch (e) {}
    return a;
  }
  /* Para los laboratorios: cancelar cualquier arrastre en curso (por ejemplo, al cambiar de misión). */
  LabCore.soltarArrastre = () => { limpiar(); };
  let escuchando = false;
  LabCore.dnd = function (o) {
    estilosMotor();
    const esPieza = c => !!c && c.hasAttribute('data-pieza') && (!o.canDrag || o.canDrag(c));
    document.addEventListener('pointerdown', e => {
      tragarClic = 0;   /* un gesto nuevo: el clic de un arrastre anterior ya no va a llegar */
      if (activo) limpiar();
      if ((e.button !== undefined && e.button > 0) || e.isPrimary === false) return;
      const c = e.target.closest && e.target.closest(o.chip);
      if (!esPieza(c)) return;
      const ctrl = e.target.closest(CONTROLES);
      if (ctrl && ctrl !== c && c.contains(ctrl)) return;   /* un control dentro de la pieza */
      activo = { o, c, id: e.pointerId, x: e.clientX, y: e.clientY, g: null, over: null };
    });
    document.addEventListener('pointermove', e => {
      const a = activo;
      if (!a || a.o !== o || e.pointerId !== a.id) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { limpiar(); return; }   /* se soltó fuera de la ventana */
      if (!a.c.isConnected || !a.c.offsetParent) { limpiar(); return; }           /* la pieza ya no está en pantalla */
      if (!a.g) {
        if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 6) return;
        const g = a.c.cloneNode(true), r = a.c.getBoundingClientRect();
        g.classList.remove('sel', 'lc-origen'); g.classList.add('lc-arrastre');
        ['id', 'data-id', 'data-pieza', 'tabindex'].forEach(n => g.removeAttribute(n));
        g.setAttribute('aria-hidden', 'true');
        g.style.width = r.width + 'px';
        document.body.appendChild(g);
        a.c.classList.add('lc-origen'); a.g = g;
      }
      e.preventDefault();
      a.g.style.left = e.clientX + 'px'; a.g.style.top = e.clientY + 'px';
      const z = document.elementFromPoint(e.clientX, e.clientY), zone = z && z.closest(o.zone);
      if (a.over && a.over !== zone) a.over.classList.remove('over');
      a.over = zone; if (zone) zone.classList.add('over');
    }, { passive: false });
    document.addEventListener('pointerup', e => {
      if (!activo || activo.o !== o || e.pointerId !== activo.id) return;
      const huboArrastre = !!activo.g, zona = activo.over;
      const a = limpiar();
      if (huboArrastre) { tragarClic = performance.now(); if (zona && zona.isConnected) o.drop(a.c, zona); }
      else if (o.tap) o.tap(a.c);
    });
    if (escuchando) return;
    escuchando = true;
    const cancelarSi = e => { if (activo && (e.pointerId === undefined || e.pointerId === activo.id)) limpiar(); };
    document.addEventListener('pointercancel', cancelarSi);
    document.addEventListener('lostpointercapture', cancelarSi);
    window.addEventListener('blur', () => limpiar());
    document.addEventListener('visibilitychange', () => { if (document.hidden) limpiar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && activo) limpiar(); });
    /* el clic que el navegador dispara justo después de soltar no debe activar nada */
    window.addEventListener('click', e => { if (tragarClic && performance.now() - tragarClic < 400) { tragarClic = 0; e.stopPropagation(); e.preventDefault(); } }, true);
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
