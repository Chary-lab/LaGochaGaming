// --- LÓGICA GLOBAL COMPARTIDA (URLs, Supabase, Menú y Tema) ---

if (window.location.pathname.endsWith('/index.html')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, cleanUrl);
}

const SUPABASE_URL = 'https://cydiyaacnyydprgffmkq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGl5YWFjbnl5ZHByZ2ZmbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjY1ODQsImV4cCI6MjEwNzM0MjU4NH0.fkipcX7Lx4lhGSa0zTDQ9BDNN3jiGTksB2hMlHH1bAs';
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === INYECCIÓN DINÁMICA DEL MENÚ DE NAVEGACIÓN ===

window.inyectarMenuGlobal = function inyectarMenuGlobal() {
    const header = document.getElementById('global-header');
    if (!header) return;

    const path = window.location.pathname;
    const enCine = path.includes('cine');
    const enSorteo = path.includes('sorteo');
    const enGaleria = path.includes('galeria');
    const enComunidad = path.includes('comunidad');
    const enInicio = path.endsWith('/') || path.includes('index.html');

    const apodo = localStorage.getItem('comunidad_nickname');
    const temaClaro = localStorage.getItem('gochi_tema') === 'light';
    const usuarioHTML = apodo
        ? `<span id="nav-user-info" style="display:inline-flex; align-items:center; gap:8px; color:var(--text-main); font-size:0.9rem; font-weight:600;">
                <i class="fa-solid fa-user" style="color:var(--accent-color);"></i>
                <span id="nav-username">${apodo}</span>
                <button onclick="cerrarSesion()" class="btn-logout-nav" title="Cerrar Sesión"><i class="fa-solid fa-right-from-bracket"></i> Salir</button>
            </span>`
        : '';
    const temaBtnHTML = `<button id="btn-toggle-tema" class="btn-tema-nav" title="Cambiar tema" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; font-size:1.1rem;">${temaClaro ? '🌙 Oscuro' : '☀️ Claro'}</button>`;

    header.innerHTML = `
        <nav class="navbar">
            <div class="logo">LAGOCHA<span>GAMING</span></div>
            <div class="nav-links">
                <a href="./" class="${enInicio ? 'nav-active' : ''}">Inicio</a>
                <a href="./#stream" class="">Directo</a>
                <a href="./#clips" class="">Clips</a>
                <a href="cine" class="${enCine ? 'nav-active' : ''}">🍿 GochiWatch</a>
                <a href="sorteo" class="${enSorteo ? 'nav-active' : ''}">🎁 Sorteo</a>
                <a href="galeria" class="${enGaleria ? 'nav-active' : ''}">📸 Galería</a>
                <a href="comunidad" class="${enComunidad ? 'nav-active' : ''}">💬 Comunidad</a>
            </div>
            <div class="auth-buttons" id="auth-buttons">
                ${temaBtnHTML}
                ${usuarioHTML}
            </div>
        </nav>
    `;
};

// === MODO CLARO / OSCURO ===

window.initTema = function initTema() {
    const temaGuardado = localStorage.getItem('gochi_tema');
    if (temaGuardado === 'light') {
        document.body.classList.add('light-mode');
    }

    const btn = document.getElementById('btn-toggle-tema');
    if (btn) {
        btn.textContent = temaGuardado === 'light' ? '🌙 Oscuro' : '☀️ Claro';
        btn.onclick = toggleTema;
    }
};

window.toggleTema = function toggleTema() {
    const esClaro = document.body.classList.toggle('light-mode');
    localStorage.setItem('gochi_tema', esClaro ? 'light' : 'dark');
    const btn = document.getElementById('btn-toggle-tema');
    if (btn) btn.textContent = esClaro ? '🌙 Oscuro' : '☀️ Claro';
};

// === SESIÓN DE COMUNIDAD ===

window.cerrarSesion = function cerrarSesion() {
    // Solo cierra sesión de comunidad (usuarios_comunidad), no toca Supabase Auth (admin independiente)
    localStorage.removeItem('comunidad_nickname');
    localStorage.removeItem('comunidad_session_token');
    localStorage.removeItem('comunidad_user_id');
    localStorage.removeItem('gochi_registrado_user');
    localStorage.removeItem('gochi_user_likes');

    mostrarToast('Sesión de comunidad cerrada');
    setTimeout(() => { window.location.reload(); }, 800);
};

window.cerrarSesionAdminGlobal = async function cerrarSesionAdminGlobal() {
    try {
        await supabase.auth.signOut();
    } catch (e) {}

    localStorage.removeItem('comunidad_nickname');
    localStorage.removeItem('comunidad_session_token');
    localStorage.removeItem('comunidad_user_id');
    localStorage.removeItem('gochi_registrado_user');

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
    inyectarMenuGlobal();
};

window.validarSesionStreamer = async function validarSesionStreamer() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
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
};

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

window.verificarSesionGlobal = function verificarSesionGlobal() {
    // La sesión de comunidad se gestiona por página (comunidad_nickname en localStorage).
};

// === INICIALIZACIÓN ===

document.addEventListener('DOMContentLoaded', () => {
    insertarComponentesUIGlobales();
    inyectarMenuGlobal();
    initTema();
    inicializarMenuMovil();
    verificarSesionGlobal();
});
