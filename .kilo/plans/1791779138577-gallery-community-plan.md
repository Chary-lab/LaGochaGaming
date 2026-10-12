# Plan para Implementar Galería Comunitaria en GitHub Pages

## Objetivo

Implementar una galería comunitario en GitHub Pages que permita a los usuarios subir imágenes y verlas en la web. El sistema debe ser simple, sin necesidad de un backend tradicional, pero debe permitir la interacción comunitaria.

## Requisitos

1. **Subida de imágenes**: Los usuarios deben poder subir imágenes desde su dispositivo.
2. **Visualización de imágenes**: Las imágenes subidas deben ser visibles para todos los usuarios.
3. **Almacenamiento**: Las imágenes deben ser almacenadas en un servicio de almacenamiento en la nube.
4. **Moderación**: Las imágenes deben ser moderadas antes de ser visibles en la web.

## Solución Propuesta

### 1. Subida de imágenes

- **Drag & Drop**: Implementar un área de arrastrar y soltar para subir imágenes.
- **File Input**: Implementar un input de tipo file para subir imágenes.

### 2. Almacenamiento

- **Supabase**: Utilizar Supabase para almacenar las imágenes y sus metadatos.

### 3. Moderación

- **Discord**: Integrar con un canal de Discord de la comunidad para moderar fotos antes de mostrarlas en la web.

### 4. Visualización

- **Galería**: Mostrar las imágenes en una galería en la web.

## Pasos de Implementación

1. **Configurar Supabase**:
   - Crear un proyecto en Supabase.
   - Configurar el almacenamiento de imágenes.
   - Configurar la base de datos para almacenar los metadatos de las imágenes.

2. **Implementar la subida de imágenes**:
   - Modificar el HTML y JavaScript de `galeria.html` para permitir la subida de imágenes.
   - Utilizar la librería de Supabase para subir las imágenes al almacenamiento de Supabase.

3. **Integrar con Discord**:
   - Crear un bot de Discord para moderar las imágenes.
   - Configurar el bot para que envíe las imágenes subidas a un canal de Discord.
   - Configurar el bot para que notifique cuando una imagen es aprobada o rechazada.

4. **Mostrar las imágenes en la web**:
   - Modificar el HTML y JavaScript de `galeria.html` para mostrar las imágenes aprobadas.
   - Utilizar la librería de Supabase para obtener las imágenes aprobadas de la base de datos.

## Validación

- **Subida de imágenes**: Verificar que los usuarios pueden subir imágenes.
- **Almacenamiento**: Verificar que las imágenes se almacenan correctamente en Supabase.
- **Moderación**: Verificar que las imágenes son moderadas correctamente en Discord.
- **Visualización**: Verificar que las imágenes aprobadas son visibles en la web.

## Riesgos

- **Seguridad**: Asegurarse de que las imágenes subidas no contengan contenido inapropiado.
- **Rendimiento**: Asegurarse de que la carga de imágenes no afecte el rendimiento de la web.

## Preguntas Abiertas

- ¿Hay algún requisito adicional para la moderación de imágenes?
- ¿Hay algún requisito adicional para la visualización de imágenes?
