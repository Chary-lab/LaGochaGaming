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

// === MODO CLARO / OSCURO / OLED (3 estados) ===
// Estados: 'dark' (default) → 'light' → 'oled' → 'dark'

window.initTema = function initTema() {
    let temaActual = localStorage.getItem('gochi_tema') || 'dark';
    if (!['dark', 'light', 'oled'].includes(temaActual)) temaActual = 'dark';
    const btn = document.getElementById('btn-toggle-tema');
    if (!btn) return;

    const icono = btn.querySelector('i');
    const aplicarTema = (tema) => {
        document.body.classList.remove('light-mode', 'oled-mode');
        if (tema === 'light') document.body.classList.add('light-mode');
        else if (tema === 'oled') document.body.classList.add('oled-mode');
        if (icono) {
            icono.className = 'fa-solid ' +
                (tema === 'light' ? 'fa-moon' :
                 tema === 'oled' ? 'fa-circle' : 'fa-sun');
        }
        btn.setAttribute('aria-label', tema === 'light' ? 'Cambiar a tema OLED' :
                                             tema === 'oled' ? 'Cambiar a tema oscuro' :
                                                               'Cambiar a tema claro');
        btn.title = tema === 'light' ? 'Tema claro → OLED' :
                                       tema === 'oled' ? 'Tema OLED → Oscuro' :
                                                         'Tema oscuro → Claro';
    };
    aplicarTema(temaActual);
    btn.onclick = () => {
        const siguiente = temaActual === 'dark' ? 'light' :
                          temaActual === 'light' ? 'oled' : 'dark';
        temaActual = siguiente;
        localStorage.setItem('gochi_tema', siguiente);
        aplicarTema(siguiente);
    };
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

// Única fuente de verdad del usuario de comunidad en el cliente.
window.obtenerSesionUsuarioComunidad = function obtenerSesionUsuarioComunidad() {
    try {
        const datos = JSON.parse(localStorage.getItem('comunidad_session_usuario') || '{}');
        return datos && typeof datos === 'object' ? datos : {};
    } catch (e) {
        return {};
    }
};

window.actualizarSesionUsuarioComunidad = function actualizarSesionUsuarioComunidad(parcial) {
    const actual = window.obtenerSesionUsuarioComunidad();
    const nuevo = Object.assign({}, actual, parcial || {});
    try {
        localStorage.setItem('comunidad_session_usuario', JSON.stringify(nuevo));
    } catch (e) {}
    return nuevo;
};

// Avatar efectivo: el guardado, el beta segun genero o null (inicial).
window.avatarUsuarioComunidad = function avatarUsuarioComunidad(usuario) {
    const u = usuario || window.obtenerSesionUsuarioComunidad();
    if (u.avatar_url) return u.avatar_url;
    if (u.genero === 'femenino') return '/img/avatars/avatar-female.webp';
    if (u.genero === 'masculino') return '/img/avatars/avatar-male.webp';
    return null;
};


// === COPIAR USUARIO (sorteo) ===
window.copiarEnlace = async function copiarEnlace(url, textoExito = '¡Enlace copiado!') {
    try {
        await navigator.clipboard.writeText(url);
        window.mostrarToast?.(textoExito);
    } catch (e) {
        // Fallback para navegadores sin clipboard API o sin HTTPS
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            window.mostrarToast?.(textoExito);
        } catch (e2) {
            window.mostrarToast?.('No se pudo copiar', true);
        }
        textarea.remove();
    }
};

// === REACCIONES MURO DE SALUDOS ===
window.establecerReaccionMuro = async function establecerReaccionMuro(muroId, emoji) {
    if (!window.supabase) return;
    const token = localStorage.getItem('comunidad_session_token');
    if (!token) {
        window.mostrarToast?.('Inicia sesión en la Comunidad para reaccionar', true);
        return;
    }
    try {
        const { data, error } = await supabase.rpc('establecer_reaccion_muro', {
            p_token: token,
            p_muro_id: muroId,
            p_emoji: emoji
        });
        if (error) throw error;
        if (!data || !data.ok) {
            if (data && data.error === 'sin_sesion') {
                window.mostrarToast?.('Sesión expirada. Inicia sesión de nuevo.', true);
            } else {
                window.mostrarToast?.('No se pudo reaccionar.', true);
            }
            return;
        }
        // La UI se actualiza vía Realtime o recarga manual
        cargarReaccionesMuro(muroId);
    } catch (e) {
        console.error(e);
        window.mostrarToast?.('Error al reaccionar.', true);
    }
};

// Cargar reacciones de un muro específico
window.cargarReaccionesMuro = async function cargarReaccionesMuro(muroId) {
    if (!window.supabase) return;
    const token = localStorage.getItem('comunidad_session_token');
    try {
        const { data, error } = await supabase.rpc('obtener_reacciones_muro', {
            p_muro_id: muroId,
            p_token: token || null
        });
        if (error) throw error;
        if (!data || !data.ok) return;
        const reacciones = data.reacciones || [];
        const container = document.querySelector(`.muro-reacciones[data-muro-id="${muroId}"]`);
        if (!container) return;
        container.innerHTML = '';
        reacciones.forEach(r => {
            const chip = document.createElement('span');
            chip.className = 'reaccion-badge' + (r.mia ? ' mia' : '');
            chip.tabIndex = 0;
            chip.setAttribute('role', 'button');
            chip.setAttribute('aria-label', `Reaccionar con ${r.emoji}, ${r.count} reacciones`);
            chip.innerHTML = `<span class="emoji">${window.escapeHtml(r.emoji)}</span><span class="count">${r.count}</span>`;
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                window.establecerReaccionMuro(muroId, r.emoji);
            });
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    window.establecerReaccionMuro(muroId, r.emoji);
                }
            });
            container.appendChild(chip);
        });
    } catch (e) {
        console.error('Error cargando reacciones muro:', e);
    }
};

// Iniciar Realtime para reacciones de muro
window.iniciarRealtimeMuroReacciones = function iniciarRealtimeMuroReacciones() {
    if (!window.supabase) return;
    try {
        supabase.channel('muro_reactions_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'muro_reactions' }, (payload) => {
                const muroId = payload.new?.muro_id || payload.old?.muro_id;
                if (muroId) {
                    window.cargarReaccionesMuro(muroId);
                }
            })
            .subscribe();
    } catch (e) {
        console.warn('Realtime muro reacciones no disponible:', e);
    }
};

window.cerrarSesion = async function cerrarSesion() {
    const token = localStorage.getItem('comunidad_session_token');
    localStorage.removeItem('comunidad_nickname');
    localStorage.removeItem('comunidad_session_token');
    localStorage.removeItem('comunidad_user_id');
    localStorage.removeItem('comunidad_session_usuario');
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
        const usuario = window.obtenerSesionUsuarioComunidad();
        const apodoSeguro = window.escapeHtml(apodo);
        const avatar = window.avatarUsuarioComunidad(usuario);
        const inicial = apodo.charAt(0).toUpperCase();
        const icono = usuario.icono || '';
        const avatarHtml = avatar
            ? `<img class="nav-user-avatar" src="${window.escapeAttr(avatar)}" alt="" loading="lazy">`
            : `<span class="nav-user-inicial" aria-hidden="true">${window.escapeHtml(inicial)}</span>`;

        navUserInfo.style.display = 'inline-flex';
        navUserInfo.innerHTML = `
            <button type="button" class="nav-user-btn" aria-haspopup="dialog" aria-expanded="false" aria-label="Abrir mi perfil y ajustes">
                ${avatarHtml}
                <span id="nav-username" class="nav-user-name">${apodoSeguro}</span>
                <span class="nav-user-icono" ${icono ? '' : 'hidden'}>${window.escapeHtml(icono)}</span>
                <i class="fa-solid fa-chevron-down nav-user-chevron" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn-logout-nav" title="Cerrar Sesión" aria-label="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i> <span class="nav-logout-texto">Salir</span></button>
        `;
        const btnPerfil = navUserInfo.querySelector('.nav-user-btn');
        if (btnPerfil) {
            btnPerfil.addEventListener('click', (e) => {
                e.stopPropagation();
                window.abrirModalPerfil?.('perfil');
            });
        }
        const btnSalir = navUserInfo.querySelector('.btn-logout-nav');
        if (btnSalir) {
            btnSalir.addEventListener('click', (e) => {
                e.stopPropagation();
                window.cerrarSesion();
            });
        }
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

window.cerrarMenuMovil = function cerrarMenuMovil(devolverFoco = false) {
    const btn = document.querySelector('.mobile-menu-toggle-btn');
    const menu = document.querySelector('.nav-links');
    if (!btn || !menu) return;
    menu.classList.remove('mobile-active');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Abrir menú');
    if (devolverFoco) btn.focus();
};

window.inicializarMenuMovil = function inicializarMenuMovil() {
    const btn = document.querySelector('.mobile-menu-toggle-btn');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;

    if (!navLinks.id) navLinks.id = 'nav-menu-principal';
    btn.setAttribute('aria-controls', navLinks.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Abrir menú');

    btn.onclick = null;
    btn.onclick = () => {
        const abierto = !navLinks.classList.contains('mobile-active');
        navLinks.classList.toggle('mobile-active', abierto);
        btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        btn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    };

    if (window.escapeMenuMovilRegistrado) return;
    window.escapeMenuMovilRegistrado = true;

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const menu = document.querySelector('.nav-links');
        if (!menu || !menu.classList.contains('mobile-active')) return;
        window.cerrarMenuMovil(true);
    });

    // Al rotar o ampliar la pantalla el menú móvil no debe quedar abierto.
    // 1101px debe coincidir con el breakpoint de .nav-links en style.css.
    const escritorio = window.matchMedia('(min-width: 1101px)');
    const alCambiar = (e) => {
        if (e.matches) window.cerrarMenuMovil(false);
    };
    if (escritorio.addEventListener) escritorio.addEventListener('change', alCambiar);
    else escritorio.addListener(alCambiar);
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
            window.cerrarMenuMovil?.(false);
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

// === MODAL DE PERFIL GLOBAL (beta 1.7.2) ===
(function () {
  let modalEl = null;
  let usuario = {};
  let avatares = [];
  let avatarSeleccionado; // undefined = no cambiar; '' = quitar; url = nuevo
  let cargando = false;

  const LINK_LABELS = {
    twitter: 'X/Twitter',
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    discord: 'Discord',
    kick: 'Kick',
    twitch: 'Twitch',
    website: 'Web'
  };
  const LINK_ICONS = {
    twitter: 'fab fa-twitter',
    instagram: 'fab fa-instagram',
    youtube: 'fab fa-youtube',
    tiktok: 'fab fa-tiktok',
    discord: 'fab fa-discord',
    kick: 'fa-solid fa-k',
    twitch: 'fab fa-twitch',
    website: 'fa-solid fa-globe'
  };
  const LINK_KEYS = Object.keys(LINK_LABELS);
  const ERRORES = {
    sin_sesion: 'Sesión expirada. Inicia sesión de nuevo.',
    baneado: 'Tu cuenta está suspendida.',
    bio_larga: 'La bio no puede superar 160 caracteres.',
    links_invalidos: 'Algún enlace no es válido (solo http/https, máx. 300).',
    avatar_invalida: 'Ese avatar no está permitido.',
    genero_invalido: 'El género seleccionado no es válido.',
    error_interno: 'No se pudo guardar. Inténtalo de nuevo.'
  };

  function escapeHtml(s) { return window.escapeHtml(String(s ?? '')); }
  function escapeAttr(s) { return window.escapeAttr(String(s ?? '')); }

  function crearModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.id = 'modal-perfil';
    modalEl.className = 'modal-perfil';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'modal-perfil-titulo');
    modalEl.hidden = true;
    modalEl.innerHTML = `
      <div class="modal-perfil-backdrop" data-close></div>
      <div class="modal-perfil-card" role="document">
        <button type="button" class="modal-perfil-close" data-close aria-label="Cerrar">&times;</button>
        <h3 id="modal-perfil-titulo">Mi perfil</h3>
        <nav class="modal-perfil-tabs" role="tablist" aria-label="Perfil y ajustes">
          <button type="button" role="tab" data-view="perfil" class="active" aria-selected="true">Perfil</button>
          <button type="button" role="tab" data-view="ajustes" aria-selected="false">Ajustes</button>
        </nav>
        <div class="modal-perfil-body" id="mp-perfil" role="tabpanel"></div>
        <div class="modal-perfil-body" id="mp-ajustes" role="tabpanel" hidden></div>
      </div>`;
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) cerrar();
      const btn = e.target.closest('[data-view]');
      if (btn) cambiarVista(btn.getAttribute('data-view'));
    });
    document.addEventListener('keydown', (e) => {
      if (!modalEl || modalEl.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    });
    return modalEl;
  }

  function setNavExpanded(abierto) {
    const btn = document.querySelector('#nav-user-info .nav-user-btn');
    if (btn) btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  }

  function abrir(vista) {
    crearModal();
    modalEl.hidden = false;
    document.body.classList.add('modal-perfil-open');
    cambiarVista(vista === 'ajustes' ? 'ajustes' : 'perfil');
    setNavExpanded(true);
    window.activarTrampaFoco?.(modalEl, modalEl.querySelector('.modal-perfil-close'));
    cargarPerfil();
  }

  function cerrar() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.classList.remove('modal-perfil-open');
    setNavExpanded(false);
    window.desactivarTrampaFoco?.();
  }

  function cambiarVista(v) {
    if (!modalEl) return;
    const tabs = modalEl.querySelectorAll('[data-view]');
    tabs.forEach((t) => {
      const activa = t.getAttribute('data-view') === v;
      t.classList.toggle('active', activa);
      t.setAttribute('aria-selected', activa ? 'true' : 'false');
    });
    modalEl.querySelector('#mp-perfil').hidden = v !== 'perfil';
    modalEl.querySelector('#mp-ajustes').hidden = v !== 'ajustes';
  }

  function inicialDe(apodo) {
    return String(apodo || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function renderLinks(links) {
    if (!links || typeof links !== 'object') return '<span class="mp-vacio">Sin enlaces.</span>';
    const piezas = [];
    LINK_KEYS.forEach((clave) => {
      const url = links[clave];
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
      piezas.push(`<a class="mp-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer"><i class="${LINK_ICONS[clave]}" aria-hidden="true"></i> ${escapeHtml(LINK_LABELS[clave])}</a>`);
    });
    return piezas.length ? piezas.join('') : '<span class="mp-vacio">Sin enlaces.</span>';
  }

  async function cargarPerfil() {
    if (!modalEl) return;
    const token = localStorage.getItem('comunidad_session_token');
    const perfilDiv = modalEl.querySelector('#mp-perfil');
    const ajustesDiv = modalEl.querySelector('#mp-ajustes');
    if (!token || !window.supabase) {
      perfilDiv.innerHTML = '<p class="mp-vacio">Inicia sesión en la Comunidad para ver tu perfil.</p>';
      ajustesDiv.innerHTML = '';
      return;
    }
    if (cargando) return;
    cargando = true;
    perfilDiv.innerHTML = '<p class="mp-cargando">Cargando perfil…</p>';
    ajustesDiv.innerHTML = '';

    usuario = window.obtenerSesionUsuarioComunidad();
    const userId = usuario.id || localStorage.getItem('comunidad_user_id');
    try {
      if (userId) {
        const { data, error } = await window.supabase
          .from('usuarios_comunidad')
          .select('apodo,puntos,rango,avatar_url,bio,links_json,icono_equipado')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          usuario = Object.assign({}, usuario, {
            id: Number(userId),
            apodo: data.apodo ?? usuario.apodo,
            puntos: data.puntos ?? usuario.puntos,
            rango: data.rango ?? usuario.rango,
            avatar_url: data.avatar_url ?? null,
            bio: data.bio ?? null,
            links_json: data.links_json ?? null,
            icono: data.icono_equipado ?? ''
          });
        }
      }

      const { data: avData, error: avError } = await window.supabase.rpc('obtener_avatares_disponibles', { p_token: token });
      if (!avError && avData && avData.ok) {
        avatares = Array.isArray(avData.avatares) ? avData.avatares : [];
        if (avData.genero) usuario.genero = avData.genero;
      }

      window.actualizarSesionUsuarioComunidad(usuario);
      avatarSeleccionado = undefined;
      renderPerfil(perfilDiv, ajustesDiv);
    } catch (e) {
      console.error('Error cargando perfil:', e);
      perfilDiv.innerHTML = '<p class="mp-error">No se pudo cargar el perfil.</p>';
    } finally {
      cargando = false;
    }
  }

  function renderPerfil(perfilDiv, ajustesDiv) {
    const avatar = window.avatarUsuarioComunidad(usuario);
    const inicial = inicialDe(usuario.apodo || localStorage.getItem('comunidad_nickname'));
    const bio = usuario.bio ? escapeHtml(usuario.bio) : '<span class="mp-vacio">Sin bio todavía.</span>';
    const icono = usuario.icono ? ` <span class="mp-icono">${escapeHtml(usuario.icono)}</span>` : '';
    const avatarPerfil = avatar
      ? `<img class="mp-avatar" src="${escapeAttr(avatar)}" alt="Avatar de ${escapeAttr(usuario.apodo || 'usuario')}">`
      : `<span class="mp-avatar-inicial" aria-hidden="true">${escapeHtml(inicial)}</span>`;

    perfilDiv.innerHTML = `
      <div class="mp-avatar-wrap">${avatarPerfil}</div>
      <h4 class="mp-apodo">${escapeHtml(usuario.apodo || localStorage.getItem('comunidad_nickname') || '')}</h4>
      <p class="mp-meta">${escapeHtml(usuario.rango || 'semilla')} · ${Number(usuario.puntos || 0)} pts${icono}</p>
      <p class="mp-bio">${bio}</p>
      <div class="mp-links">${renderLinks(usuario.links_json)}</div>
      <div class="mp-actions">
        <button type="button" id="mp-ir-ajustes" class="btn-primary"><i class="fa-solid fa-sliders"></i> Editar perfil y ajustes</button>
        <button type="button" id="mp-cerrar-sesion" class="btn-muted"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button>
      </div>`;
    perfilDiv.querySelector('#mp-ir-ajustes')?.addEventListener('click', () => cambiarVista('ajustes'));
    perfilDiv.querySelector('#mp-cerrar-sesion')?.addEventListener('click', () => window.cerrarSesion?.());

    const links = usuario.links_json && typeof usuario.links_json === 'object' ? usuario.links_json : {};
    const inputsLinks = LINK_KEYS.map((clave) => `
      <label class="mp-link-field">
        <span><i class="${LINK_ICONS[clave]}" aria-hidden="true"></i> ${LINK_LABELS[clave]}</span>
        <input type="url" data-link="${clave}" value="${escapeAttr(links[clave] || '')}" placeholder="https://..." autocomplete="url">
      </label>`).join('');

    ajustesDiv.innerHTML = `
      <div class="mp-avatar-wrap">
        <img id="mp-avatar-preview" class="mp-avatar" src="${avatar ? escapeAttr(avatar) : ''}" alt="Vista previa del avatar" ${avatar ? '' : 'hidden'}>
        <span id="mp-avatar-inicial" class="mp-avatar-inicial" aria-hidden="true" ${avatar ? 'hidden' : ''}>${escapeHtml(inicial)}</span>
      </div>
      <div class="mp-avatar-acciones">
        <button type="button" id="mp-quitar-avatar" class="btn-primary btn-muted">Usar avatar por defecto</button>
      </div>
      <div class="mp-avatar-choices" id="mp-avatar-choices" aria-label="Avatares disponibles"></div>
      <label class="mp-field">Género
        <select id="mp-genero">
          <option value="femenino">Femenino</option>
          <option value="masculino">Masculino</option>
          <option value="no_definido">No definido</option>
        </select>
      </label>
      <label class="mp-field">Bio <span class="mp-contador" id="mp-bio-count">0/160</span>
        <textarea id="mp-bio" maxlength="160" placeholder="Cuéntanos algo sobre ti...">${escapeHtml(usuario.bio || '')}</textarea>
      </label>
      <fieldset class="mp-links-grid">
        <legend>Enlaces sociales</legend>
        ${inputsLinks}
      </fieldset>
      <p id="mp-error" class="mp-error" role="alert" hidden></p>
      <div class="mp-actions">
        <button type="button" id="mp-cancelar" class="btn-primary btn-muted">Cancelar</button>
        <button type="button" id="mp-guardar" class="btn-primary">Guardar cambios</button>
      </div>`;

    const generoSel = ajustesDiv.querySelector('#mp-genero');
    if (generoSel) generoSel.value = usuario.genero || 'no_definido';

    const bioInput = ajustesDiv.querySelector('#mp-bio');
    const bioCount = ajustesDiv.querySelector('#mp-bio-count');
    const actualizarContador = () => {
      if (bioInput && bioCount) bioCount.textContent = `${bioInput.value.length}/160`;
    };
    actualizarContador();
    bioInput?.addEventListener('input', actualizarContador);

    const previewImg = ajustesDiv.querySelector('#mp-avatar-preview');
    const previewInicial = ajustesDiv.querySelector('#mp-avatar-inicial');
    const choices = ajustesDiv.querySelector('#mp-avatar-choices');

    const setPreview = (url) => {
      if (url) {
        if (previewImg) { previewImg.src = url; previewImg.hidden = false; }
        if (previewInicial) previewInicial.hidden = true;
      } else {
        if (previewImg) { previewImg.removeAttribute('src'); previewImg.hidden = true; }
        if (previewInicial) previewInicial.hidden = false;
      }
    };
    const marcarSeleccion = (url) => {
      choices?.querySelectorAll('.mp-avatar-choice').forEach((b) => {
        b.classList.toggle('selected', !!url && b.dataset.url === url);
      });
    };

    if (choices) {
      choices.innerHTML = '';
      if (!avatares.length) {
        choices.innerHTML = '<span class="mp-vacio">No se pudieron cargar los avatares.</span>';
      }
      avatares.forEach((a) => {
        if (!a || !a.url) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mp-avatar-choice';
        btn.dataset.url = a.url;
        btn.title = a.nombre || 'Avatar';
        btn.setAttribute('aria-label', `Elegir ${a.nombre || 'avatar'}`);
        btn.innerHTML = `<img src="${escapeAttr(a.url)}" alt="${escapeAttr(a.nombre || 'Avatar')}" loading="lazy">`;
        btn.addEventListener('click', () => {
          avatarSeleccionado = a.url;
          setPreview(a.url);
          marcarSeleccion(a.url);
        });
        choices.appendChild(btn);
      });
      if (avatar) marcarSeleccion(avatar);
    }

    ajustesDiv.querySelector('#mp-quitar-avatar')?.addEventListener('click', () => {
      avatarSeleccionado = '';
      const generoActual = ajustesDiv.querySelector('#mp-genero')?.value || 'no_definido';
      const porDefecto = generoActual === 'femenino'
        ? '/img/avatars/avatar-female.webp'
        : (generoActual === 'masculino' ? '/img/avatars/avatar-male.webp' : null);
      setPreview(porDefecto);
      marcarSeleccion(null);
    });

    generoSel?.addEventListener('change', () => {
      if (avatarSeleccionado !== '') return;
      const porDefecto = generoSel.value === 'femenino'
        ? '/img/avatars/avatar-female.webp'
        : (generoSel.value === 'masculino' ? '/img/avatars/avatar-male.webp' : null);
      setPreview(porDefecto);
    });

    ajustesDiv.querySelector('#mp-cancelar')?.addEventListener('click', () => cambiarVista('perfil'));
    ajustesDiv.querySelector('#mp-guardar')?.addEventListener('click', () => guardarPerfil(ajustesDiv));
  }

  function mostrarError(ajustesDiv, mensaje) {
    const el = ajustesDiv.querySelector('#mp-error');
    if (!el) return;
    el.textContent = mensaje;
    el.hidden = false;
  }

  async function guardarPerfil(ajustesDiv) {
    const token = localStorage.getItem('comunidad_session_token');
    if (!token || !window.supabase) {
      mostrarError(ajustesDiv, ERRORES.sin_sesion);
      return;
    }

    const bio = ajustesDiv.querySelector('#mp-bio')?.value.trim() || '';
    const genero = ajustesDiv.querySelector('#mp-genero')?.value || 'no_definido';
    const links = {};
    let enlaceInvalido = false;
    LINK_KEYS.forEach((clave) => {
      const input = ajustesDiv.querySelector(`[data-link="${clave}"]`);
      const valor = input ? input.value.trim() : '';
      if (!valor) return;
      if (!/^https?:\/\//i.test(valor) || valor.length > 300) {
        enlaceInvalido = true;
        return;
      }
      links[clave] = valor;
    });
    if (enlaceInvalido) {
      mostrarError(ajustesDiv, ERRORES.links_invalidos);
      return;
    }

    const payload = {
      p_token: token,
      p_bio: bio,
      p_links_json: links,
      p_genero: genero
    };
    if (avatarSeleccionado !== undefined) {
      payload.p_avatar_url = avatarSeleccionado;
    }

    const btn = ajustesDiv.querySelector('#mp-guardar');
    if (btn) btn.disabled = true;
    try {
      const { data, error } = await window.supabase.rpc('actualizar_perfil_comunidad', payload);
      if (error) {
        console.error('Error guardando perfil:', error);
        mostrarError(ajustesDiv, ERRORES.error_interno);
        return;
      }
      if (!data || !data.ok) {
        mostrarError(ajustesDiv, ERRORES[data?.error] || ERRORES.error_interno);
        return;
      }

      const perfil = data.perfil || data;
      const actualizado = window.actualizarSesionUsuarioComunidad({
        avatar_url: perfil.avatar_url !== undefined ? perfil.avatar_url : (usuario.avatar_url ?? null),
        bio: perfil.bio !== undefined ? perfil.bio : (usuario.bio ?? null),
        links_json: perfil.links_json !== undefined
          ? perfil.links_json
          : (perfil.links !== undefined ? perfil.links : links),
        genero: perfil.genero !== undefined ? perfil.genero : genero,
        icono: perfil.icono !== undefined ? perfil.icono : (usuario.icono || '')
      });
      usuario = Object.assign({}, usuario, actualizado);
      window.actualizarUsuarioNavComunidad?.();
      window.recargarPerfilComunidad?.();
      window.mostrarToast?.('Perfil actualizado');
      cerrar();
    } catch (e) {
      console.error('Error guardando perfil:', e);
      mostrarError(ajustesDiv, ERRORES.error_interno);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  window.abrirModalPerfil = abrir;
  window.cerrarModalPerfil = cerrar;
})();
