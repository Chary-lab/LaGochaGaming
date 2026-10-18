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
    let themeObserver = null;
    let currentAppliedTheme = null;

    function applyTheme(theme) {
        currentAppliedTheme = theme;
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
    }

    function toggleTheme() {
        const isLight = document.body.classList.contains('light-mode');
        const newTheme = isLight ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    window.initTheme = function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        let currentTheme = savedTheme;

        if (!currentTheme) {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                currentTheme = 'light';
            } else {
                currentTheme = 'dark';
            }
        }

        applyTheme(currentTheme);

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.onclick = null;
            themeBtn.removeEventListener('click', toggleTheme);
            themeBtn.addEventListener('click', toggleTheme);
        }

        // Observar cambios en DOM para reenganchar si el botón se recrea dinámicamente
        if (!themeObserver && document.body) {
            themeObserver = new MutationObserver(() => {
                const btn = document.getElementById('theme-toggle');
                if (btn) {
                    if (!btn._themeBound) {
                        btn.onclick = null;
                        btn.removeEventListener('click', toggleTheme);
                        btn.addEventListener('click', toggleTheme);
                        btn._themeBound = true;
                    }
                    const saved = localStorage.getItem('theme') || currentAppliedTheme || currentTheme;
                    applyTheme(saved);
                }
            });

            themeObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };

    // Auto-inicializar tan pronto como sea posible (independiente de DOMContentLoaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initTheme, { once: true });
    } else {
        window.initTheme();
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    insertarComponentesUIGlobales();
    inicializarMenuMovil();
    
    // Verificar sesión de usuario de comunidad en todas las páginas
    verificarSesionGlobal();
});