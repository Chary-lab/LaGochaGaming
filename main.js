// --- LÓGICA GLOBAL COMPARTIDA (Tema, URLs, Supabase y Notificaciones) ---

if (window.location.pathname.endsWith('/index.html')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, cleanUrl);
}

const SUPABASE_URL = 'https://cydiyaacnyydprgffmkq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGl5YWFjbnl5ZHByZ2ZmbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjY1ODQsImV4cCI6MjEwNzM0MjU4NH0.fkipcX7Lx4lhGSa0zTDQ9BDNN3jiGTksB2hMlHH1bAs';
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === GESTIÓN GLOBAL DE TEMA (INDEPENDIENTE DE LOGIN) ===
(function () {
    const STORAGE_KEY = 'theme';
    const CLASS_LIGHT = 'light-mode';
    const BTN_ID = 'theme-toggle';

    function getIcon(theme) {
        return theme === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add(CLASS_LIGHT);
        } else {
            document.body.classList.remove(CLASS_LIGHT);
        }
        const btn = document.getElementById(BTN_ID);
        if (btn) {
            btn.innerHTML = getIcon(theme);
        }
    }

    function toggleTheme() {
        const isLight = document.body.classList.contains(CLASS_LIGHT);
        const newTheme = isLight ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEY, newTheme);
        applyTheme(newTheme);
    }

    window.initTheme = function initTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        let theme = saved;
        if (!theme) {
            theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
                ? 'light' : 'dark';
        }
        applyTheme(theme);

        const btn = document.getElementById(BTN_ID);
        if (btn) {
            btn.onclick = null;
            btn.removeEventListener('click', toggleTheme);
            btn.addEventListener('click', toggleTheme);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme, { once: true });
    } else {
        initTheme();
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    insertarComponentesUIGlobales();
    inicializarMenuMovil();
    verificarSesionGlobal();
});

// === COMPONENTES UI GLOBALES (toast, confirm modal, menú móvil, sesión) ===

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

window.validarSesionStreamer = async function validarSesionStreamer() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (e) {
        return false;
    }
};

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
    // La sesión de comunidad se gestiona por página (comunidad_nickname en localStorage),
    // independiente del login de Supabase. Reservado para comprobaciones globales futuras.
};
