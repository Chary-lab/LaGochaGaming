// --- LÓGICA GLOBAL COMPARTIDA (Tema, URLs, Supabase y Notificaciones) ---

if (window.location.pathname.endsWith('/index.html')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, cleanUrl);
}

const SUPABASE_URL = 'https://cydiyaacnyydprgffmkq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGl5YWFjbnl5ZHByZ2ZmbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjY1ODQsImV4cCI6MjEwNzM0MjU4NH0.fkipcX7Lx4lhGSa0zTDQ9BDNN3jiGTksB2hMlHH1bAs';
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Manejo de Tema Claro/Oscuro
    const themeBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            let theme = 'dark';
            if (document.body.classList.contains('light-mode')) {
                theme = 'light';
                themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
            localStorage.setItem('theme', theme);
        });
    }

    insertarComponentesUIGlobales();
    inicializarMenuMovil();
});

// Toast Notificación Flotante Abajo-Centro
function mostrarToast(mensaje, esError = false) {
    let toast = document.getElementById('gochi-toast');
    if (!toast) return;

    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (toastMsg) toastMsg.innerText = mensaje;
    if (toastIcon) {
        if (esError) {
            toastIcon.className = 'fa-solid fa-circle-exclamation';
            toastIcon.style.color = '#ff4d4d';
            toast.style.borderColor = '#ff4d4d';
        } else {
            toastIcon.className = 'fa-solid fa-circle-check';
            toastIcon.style.color = '#53fc18';
            toast.style.borderColor = 'var(--accent-color)';
        }
    }

    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// Modal de Confirmación Personalizado (Sustituto de confirm)
function mostrarConfirmacionModal({ titulo = '¿Confirmar acción?', mensaje = '¿Estás seguro de continuar?', textoConfirmar = 'Aceptar', textoCancelar = 'Cancelar', enConfirmar }) {
    let modal = document.getElementById('gochi-confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-modal-title').innerText = titulo;
    document.getElementById('confirm-modal-msg').innerText = mensaje;

    const btnConfirm = document.getElementById('btn-confirm-accept');
    const btnCancel = document.getElementById('btn-confirm-cancel');

    btnConfirm.innerText = textoConfirmar;
    btnCancel.innerText = textoCancelar;

    modal.style.display = 'flex';

    btnConfirm.onclick = () => {
        modal.style.display = 'none';
        if (enConfirmar) enConfirmar();
    };

    btnCancel.onclick = () => {
        modal.style.display = 'none';
    };
}

function insertarComponentesUIGlobales() {
    if (!document.getElementById('gochi-toast')) {
        const toastHTML = `
            <div id="gochi-toast" class="gochi-toast-center">
                <i id="toast-icon" class="fa-solid fa-circle-check" style="color: #53fc18; font-size: 1.2rem;"></i>
                <span id="toast-message">Operación realizada</span>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
    }

    if (!document.getElementById('gochi-confirm-modal')) {
        const modalHTML = `
            <div id="gochi-confirm-modal" class="gochi-modal-overlay" style="display: none;">
                <div class="gochi-modal-box">
                    <h3 id="confirm-modal-title" style="color: var(--accent-color); font-size: 1.1rem; margin-bottom: 10px;">¿Confirmar acción?</h3>
                    <p id="confirm-modal-msg" style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;"></p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="btn-confirm-accept" class="btn-primary" style="padding: 8px 18px; border: none; cursor: pointer;">Aceptar</button>
                        <button id="btn-confirm-cancel" class="btn-primary" style="background: var(--text-muted); padding: 8px 18px; border: none; cursor: pointer;">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Inicializar el Menú Expandible Móvil
function inicializarMenuMovil() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    if (!document.getElementById('mobile-menu-toggle')) {
        const authButtons = nav.querySelector('.auth-buttons');
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mobile-menu-toggle';
        toggleBtn.className = 'mobile-menu-toggle-btn';
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        toggleBtn.onclick = toggleMenuMovil;
        if (authButtons) {
            authButtons.parentNode.insertBefore(toggleBtn, authButtons);
        }
    }
}

function toggleMenuMovil() {
    const navLinks = document.querySelector('.nav-links');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    if (!navLinks) return;

    navLinks.classList.toggle('mobile-active');
    if (navLinks.classList.contains('mobile-active')) {
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }
}

async function validarSesionStreamer() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return false;
        return true;
    } catch (e) {
        return false;
    }
}

async function cerrarSesionAdminGlobal() {
    mostrarConfirmacionModal({
        titulo: '🔒 Cerrar Sesión',
        mensaje: '¿Estás segura de que deseas cerrar la sesión de administración?',
        textoConfirmar: 'Sí, Salir',
        enConfirmar: async () => {
            try {
                await supabase.auth.signOut();
                location.reload();
            } catch (e) {
                console.error("Error al cerrar sesión:", e);
            }
        }
    });
}