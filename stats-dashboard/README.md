# Yacuvina Stats Dashboard (Externo)

Dashboard estático y desacoplado para visualizar `/api/_stats/visitas`.

## Uso Rápido
1. Sube esta carpeta tal cual a un hosting estático (GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3, etc.)
2. Abre `index.html` en el navegador.
3. Ingresa la URL base (ej: `https://tu-backend.onrender.com`).
4. (Opcional) Ingresa `X-Admin-Token` si tu endpoint está protegido.
5. Pulsa **Cargar** o activa **Auto 30s**.

## Características
- KPIs de hoy y acumulados.
- Gráfica diaria (barras).
- Gráfica mensual (líneas).
- Top rutas del día.
- Distribuciones geográficas (hoy vs histórico) por país y ciudad.
- JSON crudo embebido para inspección.
- Auto refresco cada 30s.

## Seguridad
El token sólo vive en memoria en el navegador. No se almacena (ni localStorage).

## Personalización
- Colores y estilos en `styles.css`.
- Lógica de parsing / visualización en `script.js`.
- Puedes duplicar gráficas o cambiar intervalos.

## Futuras Mejores (ideas)
- Exportar CSV.
- Filtros por rango de fechas.
- Modo oscuro/claro.
- Serie temporal de países/ciudades.

---
Hecho para monitorear Yacuvina en tiempo real desde cualquier lugar 🌄
