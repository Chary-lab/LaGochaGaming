#!/usr/bin/env node
/*
 * Validaciones estáticas del sitio (sin dependencias).
 * Uso: node scripts/check.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'comunidad.html', 'galeria.html', 'sorteo.html', 'cine.html'];

const errores = [];
const avisos = [];
const leer = (archivo) => fs.readFileSync(path.join(ROOT, archivo), 'utf8');
const existe = (archivo) => fs.existsSync(path.join(ROOT, archivo));

function error(mensaje) { errores.push(mensaje); }
function aviso(mensaje) { avisos.push(mensaje); }

function comprobarSintaxis(archivo, codigo) {
    try {
        new vm.Script(codigo, { filename: archivo });
    } catch (e) {
        error(`${archivo}: error de sintaxis JS -> ${e.message}`);
    }
}

function normalizarRutaLocal(valor) {
    let limpio = valor.split('#')[0].split('?')[0];
    if (!limpio || limpio === '.' || limpio === './') return 'index.html';
    if (/^(https?:)?\/\//i.test(limpio) || /^(data|blob|mailto|javascript):/i.test(limpio)) return null;
    limpio = limpio.replace(/^\.\//, '').replace(/^\//, '');
    if (limpio.endsWith('/')) return path.posix.join(limpio, 'index.html');
    if (!path.posix.extname(limpio)) {
        if (existe(limpio + '.html')) return limpio + '.html';
        if (existe(path.posix.join(limpio, 'index.html'))) return path.posix.join(limpio, 'index.html');
    }
    return limpio;
}

// Versión
const version = leer('VERSION').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    error(`VERSION no es SemVer: "${version}"`);
}

// main.js
const mainJs = leer('main.js');
comprobarSintaxis('main.js', mainJs);
if (/service_role|serviceRole/i.test(mainJs)) {
    error('main.js parece contener una clave service_role (nunca debe estar en el cliente)');
}

// CSS
const css = leer('style.css');
const abre = (css.match(/\{/g) || []).length;
const cierra = (css.match(/\}/g) || []).length;
if (abre !== cierra) error(`style.css: llaves desbalanceadas (${abre} vs ${cierra})`);

// _headers
const headers = leer('_headers');
if (!headers.includes('wss://*.supabase.co')) {
    error('_headers: falta wss://*.supabase.co en connect-src (Supabase Realtime)');
}
if (!headers.includes('https://www.youtube.com')) {
    error('_headers: falta https://www.youtube.com en script-src (YouTube IFrame API)');
}

for (const pagina of PAGES) {
    if (!existe(pagina)) { error(`Falta la página ${pagina}`); continue; }
    const html = leer(pagina);

    if (!/<html[^>]*\blang="es"/i.test(html)) error(`${pagina}: falta lang="es"`);
    if (!/<meta[^>]+charset="UTF-8"/i.test(html)) error(`${pagina}: falta meta charset UTF-8`);
    if (!/<meta[^>]+name="viewport"/i.test(html)) error(`${pagina}: falta meta viewport`);
    if (!/<title>[^<]+<\/title>/i.test(html)) error(`${pagina}: falta <title>`);
    if (!/<meta[^>]+name="description"/i.test(html)) error(`${pagina}: falta meta description`);
    if (!/<link[^>]+rel="canonical"/i.test(html)) error(`${pagina}: falta canonical`);

    const h1 = (html.match(/<h1\b/gi) || []).length;
    if (h1 !== 1) aviso(`${pagina}: se esperaba 1 <h1>, hay ${h1}`);

    // IDs duplicados
    const ids = [...html.matchAll(/(?<![\w-])id="([^"]+)"/g)].map((m) => m[1]);
    const vistos = new Set();
    const duplicados = new Set();
    for (const id of ids) {
        if (vistos.has(id)) duplicados.add(id);
        vistos.add(id);
    }
    if (duplicados.size) error(`${pagina}: IDs duplicados -> ${[...duplicados].join(', ')}`);

    // Mustaches de Blade/Vue dentro de atributos (no se interpolan en Alpine).
    if (/:[a-z0-9-]+="[^"]*\{\{/i.test(html)) {
        error(`${pagina}: hay {{ }} dentro de un atributo con binding (usa una expresión JS)`);
    }

    // Enlaces target=_blank sin rel
    for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
        if (!/\brel="/i.test(m[0])) aviso(`${pagina}: enlace target="_blank" sin rel -> ${m[0].slice(0, 80)}`);
    }

    // Recursos locales
    for (const m of html.matchAll(/(?<!:)\b(?:src|href)="([^"]+)"/gi)) {
        const original = m[1];
        if (original.startsWith('#')) continue;
        const local = normalizarRutaLocal(original);
        if (local && !existe(local)) error(`${pagina}: recurso local inexistente -> ${original}`);
    }

    // Scripts inline
    let inline = 0;
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const attrs = m[1];
        const codigo = m[2];
        if (/\bsrc\s*=/.test(attrs)) {
            const src = attrs.match(/\bsrc\s*=\s*"([^"]+)"/i);
            if (src) {
                const local = normalizarRutaLocal(src[1]);
                if (local && !existe(local)) error(`${pagina}: script local inexistente -> ${src[1]}`);
            }
            continue;
        }
        inline++;
        if (codigo.trim()) comprobarSintaxis(`${pagina} (script inline #${inline})`, codigo);
    }
}

// Sitemap: todas las páginas públicas
const sitemap = leer('sitemap.xml');
for (const pagina of PAGES) {
    const url = pagina === 'index.html' ? 'https://lagochagaming.com/' : `https://lagochagaming.com/${pagina.replace(/\.html$/, '')}`;
    if (!sitemap.includes(url)) aviso(`sitemap.xml: no incluye ${url}`);
}

if (avisos.length) {
    console.log('\nAvisos:');
    for (const a of avisos) console.log('  - ' + a);
}
if (errores.length) {
    console.error('\nErrores:');
    for (const e of errores) console.error('  - ' + e);
    console.error(`\n${errores.length} error(es).`);
    process.exit(1);
}

console.log(`OK - ${PAGES.length} páginas, main.js, CSS y _headers validados (versión ${version}).`);
