// --- LÓGICA GLOBAL COMPARTIDA (URLs, Supabase, Menú y Tema) ---

if (window.location.pathname.endsWith('/index.html')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, cleanUrl);
}

const SUPABASE_URL = 'https://cydiyaacnyydprgffmkq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGl5YWFjbnl5ZHByZ2ZmbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjY1ODQsImV4cCI6MjEwNzM0MjU4NH0.fkipcX7Lx4lhGSa0zTDQ9BDNN3jiGTksB2hMlHH1bAs';
if (window.supabase) {
    try {
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.error('Error inicializando Supabase:', e);
    }
}

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

window.cerrarSesion = function cerrarSesion() {
    localStorage.removeItem('comunidad_nickname');
    localStorage.removeItem('comunidad_session_token');
    localStorage.removeItem('comunidad_user_id');
    localStorage.removeItem('gochi_registrado_user');
    localStorage.removeItem('gochi_user_likes');

    mostrarToast('Sesión de comunidad cerrada');
    setTimeout(() => { window.location.reload(); }, 800);
};

window.cerrarSesionAdminGlobal = async function cerrarSesionAdminGlobal() {
    if (window.supabase) {
        try {
            await window.supabase.auth.signOut();
        } catch (e) {}
    }

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
        const apodoSeguro = String(apodo).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        navUserInfo.style.display = 'inline-flex';
        navUserInfo.innerHTML = `
            <i class="fa-solid fa-user" style="color:var(--accent-color);"></i>
            <span id="nav-username">${apodoSeguro}</span>
            <button onclick="cerrarSesion()" class="btn-logout-nav" title="Cerrar Sesión" aria-label="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i> Salir</button>
        `;
    } else if (!apodo && navUserInfo) {
        navUserInfo.innerHTML = '';
        navUserInfo.style.display = 'none';
    }
};

window.validarSesionStreamer = async function validarSesionStreamer() {
    try {
        if (!window.supabase) return false;
        const { data: { session } } = await window.supabase.auth.getSession();
        return !!session;
    } catch (e) {
        return false;
    }
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
        modal.innerHTML = `
            <div class="gochi-modal-box">
                <h3 id="gochi-confirm-titulo" style="margin:0 0 10px; color:var(--text-main);">Confirmar</h3>
                <p id="gochi-confirm-mensaje" style="color:var(--text-muted); margin-bottom:20px;"></p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button id="gochi-confirm-cancelar" class="btn-primary" style="background:var(--text-muted); border:none;">Cancelar</button>
                    <button id="gochi-confirm-confirmar" class="btn-primary" style="border:none;">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};

window.mostrarToast = function mostrarToast(mensaje, esError = false) {
    const toast = document.getElementById('gochi-toast');
    if (!toast) return;
    toast.textContent = mensaje;
    if (esError) {
        toast.style.borderColor = '#ff4d4d';
        toast.style.boxShadow = '0 0 15px rgba(255,77,77,0.4)';
    } else {
        toast.style.borderColor = 'var(--accent-color)';
        toast.style.boxShadow = 'var(--glow)';
    }
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
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
};

function cerrarConfirmModal() {
    const modal = document.getElementById('gochi-confirm-modal');
    if (modal) modal.style.display = 'none';
}

// === MENÚ MÓVIL ===

window.inicializarMenuMovil = function inicializarMenuMovil() {
    const btn = document.querySelector('.mobile-menu-toggle-btn');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;
    btn.onclick = null;
    btn.onclick = () => {
        navLinks.classList.toggle('mobile-active');
    };
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
        }
        // Cerrar menú móvil tras clickear un enlace
        link.addEventListener('click', () => {
            const btn = document.querySelector('.mobile-menu-toggle-btn');
            const navLinksMenu = document.querySelector('.nav-links');
            if (btn && navLinksMenu) navLinksMenu.classList.remove('mobile-active');
        });
    });
};

window.verificarSesionGlobal = function verificarSesionGlobal() {
    // La sesión de comunidad se gestiona por página (comunidad_nickname en localStorage).
};

window.formatNumber = function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
};

// === POLLING DE ESTADO DEL STREAM ===
window._streamInterval = null;
window._ultimaEstadoEnVivo = null;

window.verificarEstadoStream = async function verificarEstadoStream() {
    if (window._streamAbort) window._streamAbort.abort();
    window._streamAbort = new AbortController();
    try {
        const response = await fetch('https://kick.com/api/v2/channels/lagochagaming', { signal: window._streamAbort.signal });
        if (!response.ok) throw new Error('Error');
        const data = await response.json();
        const enVivo = data.livestream && data.livestream.is_live === true;

        const navbar = document.querySelector('.navbar');
        const toast = document.getElementById('stream-toast');

        // Actualizar contador de followers si existe (solo en index.html)
        const followersCount = data.followers_count ?? data.channel?.followers_count ?? data.user?.followers_count;
        const followersEl = document.getElementById('kick-followers-count');
        if (followersEl && followersCount !== undefined) {
            followersEl.textContent = formatNumber(followersCount);
            followersEl.title = followersCount.toLocaleString('es-ES') + ' seguidores';
        }

        if (enVivo) {
            if (navbar) navbar.classList.add('live-glow');
            
            // Mostrar toast si no está visible
            if (toast && toast.style.display !== 'flex') {
                mostrarToastStream();
            }
        } else {
            if (navbar) navbar.classList.remove('live-glow');
            if (toast) toast.style.display = 'none';
        }

        // Notificar a la página actual (paneles específicos) sin duplicar el fetch
        if (typeof window.actualizarEstadoStreamPagina === 'function') {
            window.actualizarEstadoStreamPagina(data, enVivo, null);
        }

        window._ultimaEstadoEnVivo = enVivo;
    } catch (err) {
        // Un abort es esperado cuando un sondeo nuevo cancela al anterior
        if (err && err.name === 'AbortError') return;
        console.error('Error verificando estado:', err);
        if (typeof window.actualizarEstadoStreamPagina === 'function') {
            window.actualizarEstadoStreamPagina(null, false, err);
        }
    }
};

window.mostrarToastStream = function mostrarToastStream() {
    const toast = document.getElementById('stream-toast');
    if (!toast) return;
    toast.classList.remove('stream-toast-hidden');
    toast.style.display = 'flex';
    
    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        cerrarToastStream();
    }, 10000);
};

window.cerrarToastStream = function cerrarToastStream() {
    const toast = document.getElementById('stream-toast');
    if (!toast) return;
    toast.style.display = 'none';
    setTimeout(() => {
        toast.classList.add('stream-toast-hidden');
    }, 300);
};

// Inicializar polling en todas las páginas
function iniciarPollingStreamGlobal() {
    // Verificar estado al cargar
    setTimeout(() => {
        if (document.visibilityState === 'visible') {
            verificarEstadoStream();
        }
    }, 500);

    // Polling cada 60s
    if (window._streamInterval) clearInterval(window._streamInterval);
    window._streamInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            verificarEstadoStream();
        }
    }, 60000);

    // Pausar cuando pestaña oculta
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            verificarEstadoStream();
            if (!window._streamInterval) {
                window._streamInterval = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        verificarEstadoStream();
                    }
                }, 60000);
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

// Event listener para cerrar toast manualmente
document.addEventListener('DOMContentLoaded', () => {
    const toastCloseBtn = document.querySelector('.stream-toast-close');
    if (toastCloseBtn) {
        toastCloseBtn.addEventListener('click', cerrarToastStream);
    }
    
    // Iniciar polling global
    iniciarPollingStreamGlobal();
});
try { insertarComponentesUIGlobales(); } catch (e) { console.error('insertarComponentesUIGlobales:', e); }
try { initTema(); } catch (e) { console.error('initTema:', e); }
try { inicializarMenuMovil(); } catch (e) { console.error('inicializarMenuMovil:', e); }
try { inicializarNavLinks(); } catch (e) { console.error('inicializarNavLinks:', e); }
try { actualizarUsuarioNavComunidad(); } catch (e) { console.error('actualizarUsuarioNavComunidad:', e); }
try { verificarSesionGlobal(); } catch (e) { console.error('verificarSesionGlobal:', e); }
