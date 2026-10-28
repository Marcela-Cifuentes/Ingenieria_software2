/* =====================================================================
 * CONFIGURACIÓN DE LOS LABORATORIOS (único archivo que se edita a mano)
 * ===================================================================== */
window.LAB_CONFIG = {

  /* ------------------------------------------------------------------
   * 1) URL DEL SERVIDOR (Google Apps Script)
   *    Pega aquí, entre las comillas, la URL que termina en /exec.
   *    La encuentras en Apps Script > Implementar > Administrar
   *    implementaciones > copia la "URL de la aplicación web".
   *    Si actualizas el Code.gs con "editar > Nueva versión", la URL
   *    NO cambia y no hay que tocar esta línea.
   * ------------------------------------------------------------------ */
  API_URL: 'https://script.google.com/macros/s/AKfycby6hFVbFORYqq3jc_TtDdZ8BO6YVBAYsNa5o9UBF-_m9_VXYEMYS8u0bH5uHeL_DHjgzw/exec',

  /* ------------------------------------------------------------------
   * 2) TARJETAS DE LA PORTADA
   *    estado: 'disponible'   se puede entrar
   *            'proximamente' se ve, pero no se puede entrar
   *            'cerrado'      se ve, y el laboratorio muestra un aviso de cierre
   *    familia: 'creacionales' | 'estructurales' | 'comportamiento'
   *    lab: el mismo nombre de la carpeta y del campo "lab" del servidor.
   * ------------------------------------------------------------------ */
  LABS: [
    { lab: 'factory-singleton', familia: 'creacionales', estado: 'disponible',
      nombre: 'Factory Method y Singleton', caso: 'DomiYa · 7 misiones',
      desc: 'Quién decide qué objeto se crea, y cómo garantizar que de algo exista uno solo.' },
    { familia: 'creacionales', estado: 'proximamente', nombre: 'Abstract Factory' },
    { lab: 'builder', familia: 'creacionales', estado: 'disponible',
      nombre: 'Builder', caso: 'DomiYa · 4 misiones',
      desc: 'Armar paso a paso un objeto con muchos datos, sin constructores gigantes.' },
    { familia: 'creacionales', estado: 'proximamente', nombre: 'Prototype' },

    { familia: 'estructurales', estado: 'proximamente', nombre: 'Adapter' },
    { familia: 'estructurales', estado: 'proximamente', nombre: 'Bridge' },
    { familia: 'estructurales', estado: 'proximamente', nombre: 'Composite' },
    { familia: 'estructurales', estado: 'proximamente', nombre: 'Decorator' },
    { familia: 'estructurales', estado: 'proximamente', nombre: 'Facade' },
    { familia: 'estructurales', estado: 'proximamente', nombre: 'Flyweight' },
    { familia: 'estructurales', estado: 'proximamente', nombre: 'Proxy' },

    { lab: 'strategy', familia: 'comportamiento', estado: 'disponible',
      nombre: 'Strategy', caso: 'PaqueteYa · 5 misiones',
      desc: 'Cambiar la forma de hacer una tarea sin tocar a quien la usa.' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Observer' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'State' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Command' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Template Method' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Iterator' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Chain of Responsibility' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Mediator' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Memento' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Visitor' },
    { familia: 'comportamiento', estado: 'proximamente', nombre: 'Interpreter' }
  ]
};
