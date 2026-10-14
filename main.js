// --- LÓGICA GLOBAL COMPARTIDA (Tema, URLs y Supabase) ---

// Limpieza automática de 'index.html' en la barra de direcciones para GitHub Pages
if (window.location.pathname.endsWith('/index.html')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, cleanUrl);
}

// Inicialización centralizada de Supabase para todo el sitio
const SUPABASE_URL = 'https://cydiyaacnyydprgffmkq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGl5YWFjbnl5ZHByZ2ZmbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjY1ODQsImV4cCI6MjEwNzM0MjU4NH0.fkipcX7Lx4lhGSa0zTDQ9BDNN3jiGTksB2hMlHH1bAs';
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
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
});

/**
 * Verifica si la sesión del streamer/admin sigue activa.
 * @returns {Promise<boolean>} - Retorna true si la sesión es válida, false si expiró.
 */
async function validarSesionStreamer() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            return false;
        }
        return true;
    } catch (e) {
        console.error("Error validando sesión:", e);
        return false;
    }
}

/**
 * Cierra la sesión de administrador globalmente e interrumpe el acceso en la página actual.
 */
async function cerrarSesionAdminGlobal() {
    if (confirm("¿Estás segura de que deseas cerrar sesión de administración?")) {
        try {
            await supabase.auth.signOut();
            location.reload();
        } catch (e) {
            console.error("Error al cerrar sesión:", e);
        }
    }
}