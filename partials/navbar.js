(function() {
    const root = document.getElementById('navbar-root');
    if (!root) return;

    const navbarHTML = `
<nav class="navbar">
    <div class="logo">LAGOCHA<span>GAMING</span></div>
    <div class="nav-links">
        <a href="./">Inicio</a>
        <a href="./#stream">Directo</a>
        <a href="./#clips">Clips</a>
        <a href="cine" class="nav-cine">🍿 GochiWatch</a>
        <a href="sorteo" class="nav-sorteo">🎁 Sorteo</a>
        <a href="galeria" class="nav-galeria">📸 Galería</a>
        <a href="comunidad" class="nav-comunidad">💬 Comunidad</a>
    </div>
    <div class="auth-buttons" id="auth-buttons">
        <span id="nav-user-info" style="display:none; align-items:center; gap:10px; color:var(--text-main); font-size:0.9rem; font-weight:600;">
            <i class="fa-solid fa-user" style="color:var(--accent-color);"></i>
            <span id="nav-username"></span>
            <button onclick="cerrarSesion()" class="btn-logout-nav" title="Cerrar Sesión"><i class="fa-solid fa-right-from-bracket"></i> Salir</button>
        </span>
    </div>
</nav>
    `;

    root.innerHTML = navbarHTML;

    const path = window.location.pathname;
    const links = root.querySelectorAll('.nav-links a');
    links.forEach(a => {
        const href = a.getAttribute('href');
        if (href === 'cine' && path.includes('cine')) a.classList.add('nav-active');
        if (href === 'sorteo' && path.includes('sorteo')) a.classList.add('nav-active');
        if (href === 'galeria' && path.includes('galeria')) a.classList.add('nav-active');
        if (href === 'comunidad' && path.includes('comunidad')) a.classList.add('nav-active');
        if (href === './' && (path.endsWith('/') || path.includes('index.html'))) a.classList.add('nav-active');
    });
})();
