const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

// Leer archivo manejando BOM UTF-16 LE / UTF-8
function readFileAsUTF8(filePath) {
    const buffer = fs.readFileSync(filePath);
    // Detectar BOM UTF-16 LE (FF FE) o UTF-16 BE (FE FF)
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return buffer.toString('utf16le');
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return buffer.toString('utf16be');
    }
    // Detectar BOM UTF-8 (EF BB BF)
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return buffer.toString('utf8', 3);
    }
    return buffer.toString('utf8');
}

// Minificación CSS simple como respaldo (elimina comentarios, espacios extra, etc.)
function simpleMinifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')           // eliminar comentarios
        .replace(/\s+/g, ' ')                        // colapsar espacios
        .replace(/;\s*/g, ';')                       // espacios después de ;
        .replace(/{\s*/g, '{')                       // espacios antes de {
        .replace(/}\s*/g, '}')                       // espacios después de }
        .replace(/:\s*/g, ':')                       // espacios después de :
        .replace(/,\s*/g, ',')                       // espacios después de ,
        .replace(/;\}/g, '}')                        // eliminar ; antes de }
        .replace(/{\s*/g, '{')
        .trim();
}

async function minifyCSS(inputFile, outputFile) {
    const css = readFileAsUTF8(inputFile);
    const originalSize = Buffer.byteLength(css, 'utf8');

    let result;
    try {
        result = new CleanCSS({ level: 2 }).minify(css);
        if (result.errors && result.errors.length) {
            console.warn(`CleanCSS warnings in ${inputFile}:`, result.errors.slice(0, 3));
        }
    } catch (e) {
        console.warn(`CleanCSS falló en ${inputFile}, usando minificación simple:`, e.message);
        result = { styles: simpleMinifyCSS(css), errors: [] };
    }

    fs.writeFileSync(outputFile, result.styles, 'utf8');
    const minifiedSize = Buffer.byteLength(result.styles, 'utf8');
    console.log(`CSS minified: ${path.relative(ROOT, inputFile)} -> ${path.relative(ROOT, outputFile)} (${originalSize} -> ${minifiedSize} bytes, ${((1 - minifiedSize / originalSize) * 100).toFixed(1)}% smaller)`);
}

async function minifyJS(inputFile, outputFile) {
    const code = readFileAsUTF8(inputFile);
    const originalSize = Buffer.byteLength(code, 'utf8');

    const result = await minify(code, {
        compress: true,
        mangle: true,
        module: false,
    });
    fs.writeFileSync(outputFile, result.code, 'utf8');
    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    console.log(`JS minified: ${path.relative(ROOT, inputFile)} -> ${path.relative(ROOT, outputFile)} (${originalSize} -> ${minifiedSize} bytes, ${((1 - minifiedSize / originalSize) * 100).toFixed(1)}% smaller)`);
}

function copyFile(src, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dest)}`);
}

function processHTML(src, dest) {
    let html = readFileAsUTF8(src);

    // Referenciar versiones minificadas de CSS y JS globales
    html = html.replace(/<link rel="stylesheet" href="style\.css">/g, '<link rel="stylesheet" href="style.min.css">');
    html = html.replace(/<script src="main\.js"><\/script>/g, '<script src="main.min.js"></script>');

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html, 'utf8');
    console.log(`HTML processed: ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dest)}`);
}

async function main() {
    if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
    fs.mkdirSync(DIST, { recursive: true });

    await minifyCSS(path.join(ROOT, 'style.css'), path.join(DIST, 'style.min.css'));
    await minifyJS(path.join(ROOT, 'main.js'), path.join(DIST, 'main.min.js'));

    const partialsSrc = path.join(ROOT, 'partials');
    const partialsDest = path.join(DIST, 'partials');
    if (fs.existsSync(partialsSrc)) {
        fs.mkdirSync(partialsDest, { recursive: true });
        for (const f of fs.readdirSync(partialsSrc)) {
            copyFile(path.join(partialsSrc, f), path.join(partialsDest, f));
        }
    }

    const imgSrc = path.join(ROOT, 'img');
    const imgDest = path.join(DIST, 'img');
    if (fs.existsSync(imgSrc)) {
        fs.mkdirSync(imgDest, { recursive: true });
        for (const f of fs.readdirSync(imgSrc)) {
            copyFile(path.join(imgSrc, f), path.join(imgDest, f));
        }
    }

    for (const f of fs.readdirSync(ROOT)) {
        if (f.endsWith('.html')) {
            processHTML(path.join(ROOT, f), path.join(DIST, f));
        }
    }

    console.log('\nBuild completo en ./dist/');
}

main().catch(err => {
    console.error('Build falló:', err);
    process.exit(1);
});
