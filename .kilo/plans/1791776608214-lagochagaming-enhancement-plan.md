# Plan: Fix de Layout en Galería - LaGochaGaming

- **Goal**: Corregir el solapamiento visual en `galeria.html` donde el contenido ("Mi Galería" y la zona de subida) queda oculto o muy pegado bajo la barra de navegación fija (`.navbar`).

## User Requirements & Decisions
1. **Fix Específico**: Solo realizar el ajuste de posicionamiento/layout en la página de galería.
2. **Consistencia**: El encabezado de la galería debe bajar para ser visible debajo de la navbar (similar al comportamiento de `index.html`).

## Proposed Changes
- **`galeria.html`**: Envolver el contenido principal en una etiqueta `<main>` o ajustar el estilo del contenedor `.content-section` para añadir un margen superior.
- **`style.css`**: (Si es necesario) Asegurar que `.content-section` tenga el `margin-top` adecuado de 65px (altura de la navbar) + un padding extra para estética.

## Step-by-Step Implementation Task List
1. **Ajuste de Margen en Galería**:
   - Modificar el estilo en línea o añadir una clase específica a `.content-section` en `galeria.html` que aplique `margin-top: 85px` (65px de navbar + 20px de respiro).
2. **Validación**:
   - Verificar que el título "Mi Galería" y el botón de subida no se solapen con la barra de navegación.

## Validation Plan
- Abrir `galeria.html` en el navegador.
- Comprobar que el título sea completamente visible.
- Verificar que el diseño siga siendo responsivo.