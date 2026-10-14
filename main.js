// --- LÓGICA GLOBAL COMPARTIDA (Tema Claro/Oscuro y Limpieza de URLs) ---

// Limpieza automática de 'index.html' en la barra de direcciones para GitHub Pages
if (window.location.pathname.endsWith('/index.html')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('/index.html', '/') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, cleanUrl);
}

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