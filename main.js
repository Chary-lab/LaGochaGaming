// --- LÓGICA GLOBAL COMPARTIDA (URLs, Supabase, Menú y Tema) ---

try {
    if (window.location.pathname.endsWith('/index.html')) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
        window.history.replaceState(null, null, cleanUrl);
    }
} catch (e) {
    // file:// no permite replaceState; se ignora
}

const SUPABASE_URL = 'https://cydiyaacnyydprgffmkq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGl5YWFjbnl5ZHByZ2ZmbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjY1ODQsImV4cCI6MjEwNzM0MjU4NH0.fkipcX7Lx4lhGSa0zTDQ9BDNN3jiGTksB2hMlHH1bAs';
if (window.supabase) {
    try {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseReady = true;
    } catch (e) {
        console.error('Error inicializando Supabase:', e);
        window.supabase = null;
        window.supabaseReady = false;
    }
} else {
    window.supabase = null;
    window.supabaseReady = false;
}

// === HELPERS COMPARTIDOS ===

// Única fuente de verdad del escapado de HTML para todo el sitio.
window.escapeHtml = function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
};

window.escapeAttr = function escapeAttr(s) {
    return String(s ?? '').replace(/["'<>]/g, c => ({
        '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;'
    }[c]));
};

// El rol de admin lo resuelve el servidor con la RPC es_admin() (lee app_metadata.role del JWT).
let _adminCache = null;

window.esAdminActual = async function esAdminActual() {
    if (!window.supabase) return false;
    const adminEnCache = () => (_adminCache ? _adminCache.ok : false);

    let user = null;
    try {
        const { data, error } = await window.supabase.auth.getSession();
        if (error) return _adminCache ? _adminCache.ok : false;
        user = data && data.session ? data.session.user : null;
    } catch (e) {
        return _adminCache ? _adminCache.ok : false;
    }

    if (!user) { _adminCache = null; return false; }
    if (user.email_confirmed_at === null) return false;
    if (_adminCache && _adminCache.userId === user.id) return _adminCache.ok;

    let ok = false;
    let definitivo = false;
    try {
        const { data, error } = await window.supabase.rpc('es_admin');
        if (error) console.warn('No se pudo verificar el rol de admin:', error.message);
        else { ok = data === true; definitivo = true; }
    } catch (e) {
        console.warn('No se pudo verificar el rol de admin:', e);
    }

    if (definitivo) _adminCache = { userId: user.id, ok: ok };
    return ok;
};

// Mantener la caché sincronizada con cambios de sesión (login/logout en otra pestaña/página).
if (window.supabase && typeof window.supabase.auth?.onAuthStateChange === 'function') {
    window.supabase.auth.onAuthStateChange(() => {
        window.refrescarCacheAdmin();
    });
}

// Se llama tras iniciar o cerrar sesión para que la caché no quede obsoleta.
window.refrescarCacheAdmin = function refrescarCacheAdmin() {
    _adminCache = null;
};

// Confeti reutilizable. Acepta el id de un canvas existente o, si no se pasa,
// crea uno efímero a pantalla completa que se elimina al terminar.
window.lanzarConfetti = function lanzarConfetti(canvasId, opciones = {}) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colores = ['#ff66b2', '#00f2fe', '#ffffff', '#ffeb3b', '#4caf50', '#9b59b6'];
    const cantidad = opciones.cantidad || 150;

    let canvas = canvasId ? document.getElementById(canvasId) : null;
    let efimero = false;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('role', 'presentation');
        document.body.appendChild(canvas);
        efimero = true;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        if (efimero) canvas.remove();
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particulas = [];
    for (let i = 0; i < cantidad; i++) {
        particulas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            color: colores[Math.floor(Math.random() * colores.length)],
            speedY: Math.random() * 5 + 2,
            speedX: Math.random() * 4 - 2,
            rotation: Math.random() * 360
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let terminado = true;
        particulas.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += 2;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
            if (p.y < canvas.height) terminado = false;
        });
        if (!terminado) {
            requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (efimero) canvas.remove();
        }
    }

    render();
};

// === TRAMPA DE FOCO PARA MODALES ===

const SELECTOR_FOCALIZABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

let _trampaFoco = null;

window.activarTrampaFoco = function activarTrampaFoco(modal, elementoInicial) {
    if (!modal) return;
    window.desactivarTrampaFoco();

    const focoPrevio = document.activeElement;

    const alTeclear = (evento) => {
        if (evento.key !== 'Tab') return;
        const focalizables = Array.from(modal.querySelectorAll(SELECTOR_FOCALIZABLE))
            .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
        if (focalizables.length === 0) {
            evento.preventDefault();
            return;
        }
        const primero = focalizables[0];
        const ultimo = focalizables[focalizables.length - 1];
        if (evento.shiftKey && document.activeElement === primero) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primero.focus();
        }
    };

    document.addEventListener('keydown', alTeclear);
    _trampaFoco = { alTeclear, focoPrevio, modal };

    const inicial = elementoInicial || modal.querySelector(SELECTOR_FOCALIZABLE);
    if (inicial && typeof inicial.focus === 'function') inicial.focus();
};

window.desactivarTrampaFoco = function desactivarTrampaFoco(restaurarFoco = true) {
    if (!_trampaFoco) return;
    document.removeEventListener('keydown', _trampaFoco.alTeclear);
    const focoPrevio = _trampaFoco.focoPrevio;
    _trampaFoco = null;
    if (restaurarFoco && focoPrevio && typeof focoPrevio.focus === 'function' && document.contains(focoPrevio)) {
        focoPrevio.focus();
    }
};

// === MODO CLARO / OSCURO ===

window.initTema = function initTema() {
    const temaGuardado = localStorage.getItem('gochi_tema');
    if (temaGuardado === 'light') {
        document.body.classList.add('light-mode');
    }

    const btn = document.getElementById('btn-toggle-tema');
    if (btn) {
        const icono = btn.querySelector('i');
        if (icono) icono.className = 'fa-solid ' + (temaGuardado === 'light' ? 'fa-moon' : 'fa-sun');
        btn.onclick = toggleTema;
    }
};

window.toggleTema = function toggleTema() {
    const esClaro = document.body.classList.toggle('light-mode');
    localStorage.setItem('gochi_tema', esClaro ? 'light' : 'dark');
    const btn = document.getElementById('btn-toggle-tema');
    if (btn) {
        const icono = btn.querySelector('i');
        if (icono) icono.className = 'fa-solid ' + (esClaro ? 'fa-moon' : 'fa-sun');
    }
};

// === SESIÓN DE COMUNIDAD ===

// Cachés locales que pertenecen a la cuenta de comunidad. Se limpian al cerrar
// sesión o cuando el servidor invalida el token para que el siguiente usuario
// no herede likes, reacciones ni rachas de la cuenta anterior.
window.limpiarCachesSesionComunidad = function limpiarCachesSesionComunidad() {
    [
        'gochi_chat_mi_reaccion_v2',
        'gochi_chat_reacciones_cache',
        'gochi_chat_mi_reaccion_pendiente_v1',
        'gochi_chat_streak',
        'gocha_user_likes',
        'chat_scroll'
    ].forEach((clave) => {
        localStorage.removeItem(clave);
        sessionStorage.removeItem(clave);
    });
};

window.cerrarSesion = async function cerrarSesion() {
    const token = localStorage.getItem('comunidad_session_token');
    localStorage.removeItem('comunidad_nickname');
    localStorage.removeItem('comunidad_session_token');
    localStorage.removeItem('comunidad_user_id');
    window.limpiarCachesSesionComunidad();

    if (token && window.supabase) {
        try {
            await window.supabase.rpc('cerrar_sesion_comunidad', { p_token: token });
        } catch (e) {
            // no bloquea el cierre local
        }
    }

    mostrarToast('Sesión de comunidad cerrada');
    setTimeout(() => { window.location.reload(); }, 800);
};

window.cerrarSesionAdminGlobal = async function cerrarSesionAdminGlobal() {
    if (window.supabase) {
        try {
            await window.supabase.auth.signOut();
        } catch (e) {}
    }
    window.refrescarCacheAdmin?.();

    document.body.classList.remove('admin-mode-active');

    const panelPendientes = document.getElementById('panelPendientes');
    if (panelPendientes) panelPendientes.style.display = 'none';
    const btnLogout = document.getElementById('btn-logout-galeria');
    if (btnLogout) btnLogout.style.display = 'none';
    const adminPanel = document.getElementById('streamerAdminPanel');
    if (adminPanel) adminPanel.style.display = 'none';
    const btnToggle = document.getElementById('btn-toggle-admin');
    if (btnToggle) {
        btnToggle.innerHTML = '<i class="fa-solid fa-lock"></i> Modo Moderación';
        btnToggle.classList.remove('active');
    }

    window.location.reload();
};

window.actualizarUsuarioNavComunidad = function actualizarUsuarioNavComunidad() {
    const apodo = localStorage.getItem('comunidad_nickname');
    const navUserInfo = document.getElementById('nav-user-info');

    if (apodo && navUserInfo) {
        const apodoSeguro = window.escapeHtml(apodo);
        navUserInfo.style.display = 'inline-flex';
        navUserInfo.innerHTML = `
            <i class="fa-solid fa-user nav-user-icon"></i>
            <span id="nav-username">${apodoSeguro}</span>
            <button type="button" class="btn-logout-nav" title="Cerrar Sesión" aria-label="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i> Salir</button>
        `;
        const btnSalir = navUserInfo.querySelector('.btn-logout-nav');
        if (btnSalir) btnSalir.addEventListener('click', window.cerrarSesion);
    } else if (!apodo && navUserInfo) {
        navUserInfo.innerHTML = '';
        navUserInfo.style.display = 'none';
    }
};

window.validarSesionStreamer = async function validarSesionStreamer() {
    return window.esAdminActual();
};

 // === COMPONENTES UI GLOBALES (toast, confirm modal, menú móvil) ===

window.insertarComponentesUIGlobales = function insertarComponentesUIGlobales() {
    if (!document.getElementById('gochi-toast')) {
        const toast = document.createElement('div');
        toast.id = 'gochi-toast';
        toast.className = 'gochi-toast-center';
        document.body.appendChild(toast);
    }
    if (!document.getElementById('gochi-confirm-modal')) {
        const modal = document.createElement('div');
        modal.id = 'gochi-confirm-modal';
        modal.className = 'gochi-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'gochi-confirm-titulo');
        modal.setAttribute('aria-describedby', 'gochi-confirm-mensaje');
        modal.innerHTML = `
            <div class="gochi-modal-box">
                <h3 id="gochi-confirm-titulo">Confirmar</h3>
                <p id="gochi-confirm-mensaje"></p>
                <div class="gochi-modal-actions">
                    <button id="gochi-confirm-cancelar" class="btn-primary btn-muted">Cancelar</button>
                    <button id="gochi-confirm-confirmar" class="btn-primary">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    insertarToastStream();
    insertarAlertaStream();
};

// Overlay de "en vivo" para las 5 páginas: se inserta una sola vez desde aquí
// para evitar markup duplicado en cada HTML.
window.insertarAlertaStream = function insertarAlertaStream() {
    if (document.getElementById('stream-alert')) return;
    const alerta = document.createElement('div');
    alerta.id = 'stream-alert';
    alerta.className = 'stream-alert-overlay';
    alerta.setAttribute('aria-live', 'polite');
    alerta.setAttribute('aria-label', 'Alerta de stream en vivo');
    alerta.innerHTML = `
        <i class="fa-solid fa-tower-broadcast"></i>
        <span id="stream-alert-text">¡LA GOCHA ESTÁ EN DIRECTO! 🎉</span>
    `;
    document.body.appendChild(alerta);
};

window.insertarToastStream = function insertarToastStream() {
    if (document.getElementById('stream-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'stream-toast';
    toast.className = 'stream-toast stream-toast-hidden';
    toast.innerHTML = `
        <div class="stream-toast-content">
            <span class="live-indicator"></span>
            <span>EN VIVO</span>
            <button class="stream-toast-close" aria-label="Cerrar notificación">&times;</button>
        </div>
        <div class="stream-toast-actions">
            <a href="https://kick.com/lagochagaming" target="_blank" rel="noopener noreferrer" class="btn-stream">
                Ir al stream <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>
    `;
    document.body.appendChild(toast);
};

window.mostrarToast = function mostrarToast(mensaje, esError = false) {
    const toast = document.getElementById('gochi-toast');
    if (!toast) return;
    if (window._toastTimer) {
        clearTimeout(window._toastTimer);
        window._toastTimer = null;
    }
    toast.textContent = mensaje;
    if (esError) {
        toast.style.borderColor = '#ff4d4d';
        toast.style.boxShadow = '0 0 15px rgba(255,77,77,0.4)';
    } else {
        toast.style.borderColor = 'var(--accent-color)';
        toast.style.boxShadow = 'var(--glow)';
    }
    toast.classList.add('show');
    window._toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        window._toastTimer = null;
    }, 3000);
};

window.mostrarConfirmacionModal = function mostrarConfirmacionModal({ titulo, mensaje, textoConfirmar = 'Confirmar', enConfirmar }) {
    const modal = document.getElementById('gochi-confirm-modal');
    if (!modal) return;
    const titEl = document.getElementById('gochi-confirm-titulo');
    const msgEl = document.getElementById('gochi-confirm-mensaje');
    const btnConf = document.getElementById('gochi-confirm-confirmar');
    const btnCanc = document.getElementById('gochi-confirm-cancelar');
    if (titEl) titEl.textContent = titulo || 'Confirmar';
    if (msgEl) msgEl.textContent = mensaje || '';
    if (btnConf) btnConf.textContent = textoConfirmar;

    const onConfirm = () => {
        if (typeof enConfirmar === 'function') enConfirmar();
        cerrarConfirmModal();
    };

    modal.style.display = 'flex';
    btnConf.onclick = null;
    btnCanc.onclick = null;
    btnConf.onclick = onConfirm;
    btnCanc.onclick = cerrarConfirmModal;
    window.activarTrampaFoco(modal, btnCanc);
};

function cerrarConfirmModal() {
    const modal = document.getElementById('gochi-confirm-modal');
    if (modal) modal.style.display = 'none';
    window.desactivarTrampaFoco();
}

// Cierra con Escape o clic en el fondo cualquier modal visible que tenga un botón de cierre.
function cerrarModalVisible() {
    const modal = [...document.querySelectorAll('.gochi-modal-overlay')]
        .find((elemento) => getComputedStyle(elemento).display !== 'none');
    if (!modal) return false;

    const botonCerrar = modal.querySelector('[data-action="close-login"], #gochi-confirm-cancelar');
    if (!botonCerrar) return false;

    botonCerrar.click();
    return true;
}

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrarModalVisible();
});

// === MENÚ MÓVIL ===

window.inicializarMenuMovil = function inicializarMenuMovil() {
    const btn = document.querySelector('.mobile-menu-toggle-btn');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.onclick = null;
    btn.onclick = () => {
        const abierto = navLinks.classList.toggle('mobile-active');
        btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    };
    if (window.escapeMenuMovilRegistrado) return;
    window.escapeMenuMovilRegistrado = true;
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const boton = document.querySelector('.mobile-menu-toggle-btn');
        const menu = document.querySelector('.nav-links');
        if (!boton || !menu || !menu.classList.contains('mobile-active')) return;
        menu.classList.remove('mobile-active');
        boton.setAttribute('aria-expanded', 'false');
        boton.focus();
    });
};

// Prevenir navegación/recarga cuando el enlace apunta a la página actual (sin hash)
window.inicializarNavLinks = function inicializarNavLinks() {
    const path = window.location.pathname;
    const normalizarPath = p => p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.includes('#')) return;
        const linkUrl = new URL(href, window.location.origin + window.location.pathname).pathname;
        if (normalizarPath(linkUrl) === normalizarPath(path)) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
            });
            link.setAttribute('aria-current', 'page');
        }
        // Cerrar menú móvil tras clickear un enlace
        link.addEventListener('click', () => {
            const btn = document.querySelector('.mobile-menu-toggle-btn');
            const navLinksMenu = document.querySelector('.nav-links');
            if (btn && navLinksMenu) {
                navLinksMenu.classList.remove('mobile-active');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    });
};

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
}

// === POLLING DE ESTADO DEL STREAM ===
window._streamInterval = null;
window._ultimaEstadoEnVivo = null;
window._streamBackoff = null;
window._streamUltimoError = 0;

window.verificarEstadoStream = async function verificarEstadoStream() {
    if (window._streamAbort) window._streamAbort.abort();
    window._streamAbort = new AbortController();

    // Backoff: si falló hace poco, esperar el intervalo de retroceso antes de reintentar
    if (window._streamBackoff && Date.now() - window._streamUltimoError < window._streamBackoff) {
        return;
    }

    const ahora = Date.now();
    let data = null;
    let enVivo = false;
    let usoCache = false;

    try {
        const cached = sessionStorage.getItem('gochi_stream_cache');
        if (cached) {
            const c = JSON.parse(cached);
            if (c && c.ts && ahora - c.ts < 60000) {
                data = c.data;
                enVivo = c.enVivo;
                usoCache = true;
            }
        }
    } catch (e) {
        // ignora caché corrupta
    }

    if (!usoCache) {
        try {
            const response = await fetch('https://kick.com/api/v2/channels/lagochagaming', { signal: window._streamAbort.signal });
            if (response.status === 429 || response.status >= 500) {
                throw new Error('HTTP ' + response.status);
            }
            if (!response.ok) throw new Error('Error');
            data = await response.json();
            enVivo = data.livestream && data.livestream.is_live === true;
            try {
                sessionStorage.setItem('gochi_stream_cache', JSON.stringify({ data, enVivo, ts: ahora }));
            } catch (e) {}
            window._streamBackoff = null;
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('Error verificando estado:', err);
            window._streamUltimoError = Date.now();
            if (!window._streamBackoff) window._streamBackoff = 60000;
            else if (window._streamBackoff < 300000) {
                window._streamBackoff = Math.min(window._streamBackoff * 2, 300000);
            }
            if (typeof window.actualizarEstadoStreamPagina === 'function') {
                window.actualizarEstadoStreamPagina(null, false, err);
            }
            return;
        }
    }

    const navbar = document.querySelector('.navbar');
    const toast = document.getElementById('stream-toast');

    // Actualizar contador de followers si existe (solo en index.html)
    const followersCount = data.followers_count ?? data.channel?.followers_count ?? data.user?.followers_count;
    const followersEl = document.getElementById('kick-followers-count');
    if (followersEl && followersCount !== undefined) {
        followersEl.textContent = formatNumber(followersCount);
        followersEl.title = followersCount.toLocaleString('es-ES') + ' seguidores';
    }

    const yaEnVivo = window._ultimaEstadoEnVivo === true;
    if (enVivo) {
        if (navbar) navbar.classList.add('live-glow');
        // Toast solo en la transición offline → live
        if (!yaEnVivo && toast && toast.classList.contains('stream-toast-hidden')) {
            mostrarToastStream();
        }
    } else {
        if (navbar) navbar.classList.remove('live-glow');
        if (toast) toast.classList.add('stream-toast-hidden');
    }

    // Notificar a la página actual (paneles específicos) sin duplicar el fetch
    if (typeof window.actualizarEstadoStreamPagina === 'function') {
        window.actualizarEstadoStreamPagina(data, enVivo, null);
    }

    window._ultimaEstadoEnVivo = enVivo;
};

window.mostrarToastStream = function mostrarToastStream() {
    const toast = document.getElementById('stream-toast');
    if (!toast) return;
    toast.classList.remove('stream-toast-hidden');

    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        cerrarToastStream();
    }, 10000);
};

window.cerrarToastStream = function cerrarToastStream() {
    const toast = document.getElementById('stream-toast');
    if (!toast) return;
    toast.classList.add('stream-toast-hidden');
};

// Inicializar polling en todas las páginas
function iniciarPollingStreamGlobal() {
    // Verificar estado al cargar
    setTimeout(() => {
        if (document.visibilityState === 'visible') {
            verificarEstadoStream();
        }
    }, 500);

    // Polling cada 90s
    if (window._streamInterval) clearInterval(window._streamInterval);
    window._streamInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            verificarEstadoStream();
        }
    }, 90000);

    // Pausar cuando pestaña oculta
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            verificarEstadoStream();
            if (!window._streamInterval) {
                window._streamInterval = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        verificarEstadoStream();
                    }
                }, 90000);
            }
        } else {
            if (window._streamInterval) {
                clearInterval(window._streamInterval);
                window._streamInterval = null;
            }
            if (window._streamAbort) {
                window._streamAbort.abort();
                window._streamAbort = null;
            }
        }
    });
}

 // Delegación única: cierre del toast de stream y de los modales por clic en el fondo.
document.addEventListener('click', (event) => {
    if (event.target.closest('.stream-toast-close')) {
        cerrarToastStream();
    }

    if (!event.target.classList.contains('gochi-modal-overlay')) return;

    const botonCerrar = event.target.querySelector('[data-action="close-login"], #gochi-confirm-cancelar');
    if (botonCerrar) botonCerrar.click();
});

document.addEventListener('DOMContentLoaded', () => {
    try { iniciarPollingStreamGlobal(); } catch (e) { console.error('iniciarPollingStreamGlobal:', e); }
    try { insertarComponentesUIGlobales(); } catch (e) { console.error('insertarComponentesUIGlobales:', e); }
    try { initTema(); } catch (e) { console.error('initTema:', e); }
    try { inicializarMenuMovil(); } catch (e) { console.error('inicializarMenuMovil:', e); }
    try { inicializarNavLinks(); } catch (e) { console.error('inicializarNavLinks:', e); }
    try { actualizarUsuarioNavComunidad(); } catch (e) { console.error('actualizarUsuarioNavComunidad:', e); }
});

