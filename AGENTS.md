# AGENTS.md - LaGochaGaming Website

Entry points: index.html (stream/clips/social), galeria.html (upload+lightbox), sorteo.html (roulette+confetti), style.css (theme), img/ (relative paths)

Critical workflow: NO terminal commands except git push; read files with native tools; edit files in ONE block; navigation/footer duplicated in ALL three HTML files

CSS architecture: colors via CSS variables; breakpoints ONLY 1024px/768px; grid layouts fixed; dark mode values fixed - don't modify --bg-color/--card-bg without updating all

Interactive features: galeria.html drag-drop uses handleFiles() - preserve like button state; sorteo.html roulette triggers confetti on winner; both share footer HTML structure

Deployment: CSS changes require full page refresh; image updates replace files in img/ then refresh; push to main branch for live updates (Kick.com + GitHub Pages)

Image management: maintain img/ structure exactly; references must be relative (img/1.jpg, img/fono.png) - no absolute paths; gallery images must be 280px height

Verification: no tests/lint/typecheck - verify manually in browser; check responsive at 1024px/768px; verify drag-drop works with picker AND drag-over; confirm roulette shows winner with confetti

References: .clinerules for workflow; style.css for CSS variables; galeria.html for upload pattern; sorteo.html for roulette logic