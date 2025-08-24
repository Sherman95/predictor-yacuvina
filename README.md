# 🌅 Yacuviña Sunset Predictor & Analytics

Predicción especializada de atardeceres ("Mar de Nubes" vs "Despejado") y panel analítico de visitas/uso para el mirador arqueológico de Yacuviña – impulsado por el **Algoritmo Yacuviña 3.0** y un sistema de métricas en tiempo (casi) real.

---
## ✨ Resumen Ejecutivo
El sistema unifica múltiples fuentes meteorológicas, las normaliza y ejecuta un motor de evaluación especializado que determina:
- Probabilidad de experimentar un espectacular **Mar de Nubes** (nubes bajas densas bajo el mirador)
- Calidad de un **Atardecer Despejado Panorámico** (visibilidad y colores óptimos)
- Escenarios mixtos evaluados automáticamente (elige el mejor)

El resultado: un puntaje categorizado (Excelente → Muy Malo), factores positivos/negativos, tipo de atardecer estimado y recomendación clara para visitantes.

---
## 🧠 Algoritmo Yacuviña 3.0
Archivo principal: `server/services/weatherService.js` (núcleo de scoring – no modificar sin comprender los principios meteorológicos de nubosidad estratificada).

### Flujo Conceptual
1. Recolección simultánea (Open-Meteo, OpenWeather, AccuWeather)
2. Adaptadores → Normalización horario/día
3. Selección de ventana cercana a la hora real de atardecer (SunCalc)
4. Evaluación de dos modelos:
   - Modelo Mar de Nubes (énfasis en nubes bajas + visibilidad + estabilidad)
   - Modelo Atardecer Despejado (énfasis en cobertura total, visibilidad, UV para colores)
5. Penalizaciones contextuales (neblina local severa, lluvia, humedad extrema, viento fuerte)
6. Conversión numérica → Categoría semántica + explicación

### Factores Ponderados (Ejemplos)
- Mar de Nubes: nubes bajas (50%), visibilidad (30%), nubes altas (10%), temperatura (5%), viento (5%)
- Despejado: cobertura total (40%), visibilidad (35%), índice UV (15%), temperatura (5%), viento (5%)

### Salida de Cada Día
```json
{
  "diaSemana": "martes",
  "prediccion": "Bueno",
  "tipoAtardecer": "Mar de Nubes",
  "puntajeNumerico": 74,
  "razon": "Mar de nubes bueno, Visibilidad excelente...",
  "horaAtardecer": "18:15",
  "temperatura": 15,
  "viento": 8,
  "humedad": 82
}
```

---
## 🏗 Arquitectura
Monorepo: `client/` (Vite + React) + `server/` (Express). Incluye además un dashboard externo de analítica (stats, pronóstico enfocado y logs) desplegado junto al backend.

| Capa | Propósito | Notas |
|------|-----------|-------|
| Server | Orquestación de APIs, algoritmo, caché | Cache file JSON local 1h |
| Services | Adaptadores y evaluadores | `weatherService.js`, `currentWeatherService.js` |
| Client | UI responsive (glassmorphism) | Mobile-first, carousels, accesible |
| Deploy | Render (API) + Vercel (Frontend) | Rutas debug para inspección |

### Flujo de Datos
```
APIs externas ─▶ Adaptadores ─▶ Combinar ─▶ Score Algoritmo ─▶ pronostico.json ─▶ API REST ─▶ UI
```

---
## 🚀 Características Destacadas
- 🔄 Multi-fuente con resiliencia (Promise.allSettled + degradación progresiva)
- 🧮 Algoritmo dual con selección dinámica de escenario
- 🕒 Cálculo solar preciso (SunCalc) para hora de atardecer local (TZ America/Guayaquil)
- 📦 Caché inteligente (current + forecast) para reducir latencia y uso de APIs externas
- ♿ Accesibilidad: `aria-live`, botones con descripciones, foco claro
- 📱 Experiencia Mobile: carruseles horizontales, scroll-snap, compacto/expandible, rendimiento optimizado
- 🌫 Optimizaciones iOS (fondo fijo con capa separada y `backdrop-filter` controlado)
- 🧩 Diseño: glassmorphism premium + gradientes cálidos + sombras suaves

---
## 📸 UI (Descripción Visual)
| Sección | Descripción |
|---------|-------------|
| Header | Card translúcida con identidad y chips de estados clave |
| Clima Actual | Vista compacta (temp + categoría + icono) + modo expandido con métricas detalladas |
| Pronóstico 7 Días | Grid/carrusel móvil con tarjetas enriquecidas (resumen + factores) |
| Mejor Día | Banner resaltado dinámicamente (score máximo) |
| Galería | Imágenes de referencia del sitio (mobile swipe / desktop grid) |
| Footer | Minimal en mobile, informativo en desktop |

---
## 📁 Estructura Relevante
```
server/
  index.js
  services/
    weatherService.js        # Algoritmo Yacuviña 3.0 (forecast)
    currentWeatherService.js # Clima actual + cache
    validationService.js     # Validaciones utilitarias
  routes/
    predictionRoutes.js
    currentWeatherRoutes.js
    debugRoutes.js
client/
  src/
    App.jsx
    components/
      ClimaActual.jsx
      PronosticoSection.jsx
      PronosticoCard.jsx
      MejorDiaBanner.jsx
      InfoSection.jsx
      Header.jsx
```

---
## 🔌 Endpoints Principales (Predicción / Clima)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/prediccion` | Pronóstico 7 días (algoritmo aplicado) |
| GET | `/api/current-weather` | Clima actual (multi-fuente + evaluación inmediata) |
| GET | `/api/debug/environment` | Diagnóstico de entorno/vars |
| GET | `/api/debug/fresh-data` | Fuerza actualización (solo dev) |

---
## 🧪 Ejemplos Rápidos
```bash
curl https://yacuvina-api-sherman95.onrender.com/api/prediccion | jq '.forecast[0]'

curl https://yacuvina-api-sherman95.onrender.com/api/current-weather | jq '.data.evaluacionYacuvina'
```

---
## 🛠 Desarrollo Local
Requisitos: Node 18+

```bash
# Instalar dependencias raíz + workspaces
npm install

# Levantar ambos (concurrente)
npm run dev
# Cliente: http://localhost:5173
# Server:  http://localhost:3001

# Sólo backend
npm run dev:server

# Sólo frontend
npm run dev:client
```

Variables (server): definir en `.env` (o variables de Render):
```
OPENWEATHER_API_KEY=xxxxx
ACCUWEATHER_API_KEY=xxxxx
WEATHERAPI_KEY=xxxxx
```
Frontend (Vercel / local):
```
VITE_API_URL=http://localhost:3001
```

---
## 🧷 Caching & Rendimiento
| Tipo | Archivo | TTL | Estrategia |
|------|---------|-----|-----------|
| Forecast | `pronostico.json` | ~1h | Reescritura programática al llamar actualizador |
| Clima Actual | `current-weather-cache.json` | 1h adaptativo | Refrescable manual / badge Fresh vs Cache |

Minimizaciones:
- No recalcular algoritmo si caché vigente
- UI móvil: ocultar métricas pesadas en modo compacto
- Diferir imágenes (prop de carga rápida vía navegador)

---
## ♿ Accesibilidad
- `aria-live="polite"` para actualizaciones de clima
- Botones con `aria-label` y estados `aria-expanded`
- Colores contrastados en badges de evaluación

---
## 🎨 Sistema de Diseño
Tokens (CSS custom properties):
- Gradientes: `--gradient-primary`, `--gradient-accent`
- Tipografía adaptativa + énfasis en valores críticos (temperatura, categoría)
- Glass Layers: `--glass-bg`, capas con blur moduladas por viewport

Patrones:
- Carousels con `scroll-snap-type: x mandatory`
- Dots indicativos sincronizados con IntersectionObserver
- Ghost padding móvil para centrar primer/último card sin gap en desktop

---
## 🔐 Seguridad / Métricas
Backend expone endpoints de métricas protegidos con JWT (login/refresh/me/logout). Las predicciones siguen siendo públicas.

Resumen:
- Claves de APIs meteorológicas sólo en backend
- CORS restringido (localhost + dominios producción)
- Contador de visitas (diario + acumulado) + geolocalización (city/country) + visit log detallado
- Integridad de datos: endpoint de verificación y consolidación

---
## 🚢 Deploy
| Tier | Plataforma | Config |
|------|-----------|--------|
| Backend API + Dashboard | Render | `render.yaml` (cd server && npm start) |
| Frontend App (React) | Vercel | Directorio `client/` |

Notas:
- Vercel: se fuerza instalación/build dentro de `client/` (ver `vercel.json`)
- Estrategias de build resilientes (rollup fijado, esbuild explícito) para evitar fallos de binarios
- Cache JSON persistida en filesystem efímero (aceptable para prototipo; considerar futura DB)

---
## 🧭 Troubleshooting Express
| Síntoma | Causa típica | Acción |
|---------|--------------|--------|
| 404 `/api/prediccion` | Falló Open-Meteo inicial | Revisar logs Render |
| Frontend sin datos | `VITE_API_URL` ausente | Definir variable en Vercel |
| CORS bloqueado | Dominio no permitido | Revisar config CORS backend |

---
## 📈 Futuras Mejores Ideas
- Persistencia de preferencia (expandido/compacto) vía localStorage
- Lazy import de galería y secciones pesadas
- Tooltips de factores explicativos (por qué subió/bajó la puntuación)
- Delta día vs día (tendencias)
- Importación histórica y archivado (rotación de logs)
- Internacionalización (es/en)

---
## 🔍 Calidad y Estilo de Código
- Convención commit: `feat|fix|refactor|style|chore(scope): mensaje`
- Servicios desacoplados: cada API adaptada antes de combinar
- Logging con timestamps + emojis (rápido de escanear)
- Evitar side-effects en servicios de cálculo (puro + testable)

---
## 🧩 Fragmento Clave (Evaluación Doble)
```js
// Selección dinámica del tipo de atardecer
const calcularScoreYacuvina = (datos) => {
  if (datos.nubes_bajas >= 60) return calcularScoreMarDeNubes(datos);
  const total = datos.nubes_bajas + datos.nubes_medias + datos.nubes_altas;
  if (total <= 60 && datos.nubes_bajas <= 30) return calcularScoreDespejado(datos);
  const m = calcularScoreMarDeNubes(datos);
  const d = calcularScoreDespejado(datos);
  return m.score > d.score ? m : d;
};
```

---
## ✅ Checklist Rápido de Verificación
- [ ] Backend responde `/api/current-weather`
- [ ] Endpoint `/api/prediccion` retorna 7 elementos
- [ ] UI muestra Mejor Día destacado
- [ ] Badge muestra `📦 Caché` o `🔄 Actualizado`
- [ ] Carousel móvil hace snap correcto
- [ ] Clima actual compacto siempre visible (icono + temp + categoría)

---
## 🤝 Contribución
Pull Requests bienvenidas. Sugerencia de flujo:
1. Crear rama `feat/nombre`
2. Añadir/actualizar pruebas (si aplica)
3. Commit convencional
4. PR con descripción del impacto meteorológico / UX

---
## 🪪 Licencia
Proyecto educativo/demostrativo. Uso externo de API keys: configura tus propias claves. (Agregar licencia formal si se requiere.)

---
## 🌄 Inspiración
Optimizar momentos únicos de luz y atmósfera para visitantes y fotógrafos en Yacuviña.

---
## 🙌 Autoría
Diseño + Ingeniería: Equipo del repositorio `Sherman95`.
Con soporte algorítmico especializado en clasificación de condiciones de atardecer.

---
> "El mejor atardecer no siempre es el más despejado; a veces el mar de nubes crea la magia." 🔭

---
## 📊 Panel de Estadísticas y Analítica (Dashboard Externo)

El proyecto incluye un dashboard estático desacoplado (`/stats-dashboard`) para monitorear en tiempo real:
- Visitas del día (total / únicas) y acumuladas (nunca se reinician).
- Distribución geográfica (ciudad / país) hoy e histórica agregada.
- Rutas más solicitadas.
- Log detallado de las últimas N visitas con hora exacta (ISO + hora local).
- Métricas del sitio vs llamadas técnicas (beacon separado de la API general).
- Pronóstico resaltado (hero del mejor día, distribución de categorías, tablas y gráficos de nubes / score).

### 🧭 Flujo de Uso Rápido (Dashboard)
1. Hospeda el contenido de `stats-dashboard/` en GitHub Pages / Vercel / Netlify o ábrelo local.
2. Ingresa la URL base del backend (Render) en el campo inicial.
3. (Opcional) Loguéate para obtener JWT y acceder a endpoints protegidos (`/api/_stats/*`).
4. Activa auto-refresco (30s) para monitoreo continuo.

### 🔐 Autenticación (Stats)
Los endpoints `/api/_stats/visitas`, `/api/_stats/visitas/log`, `/api/_stats/reset`, `/api/_stats/integridad` requieren JWT emitido por `/api/auth/login` (con credenciales configuradas en variables de entorno). Flujo:
1. POST `/api/auth/login` (recibe access + refresh tokens).
2. GET `/api/auth/me` (verificación).
3. POST `/api/auth/refresh` (renueva access token cuando expira).
4. POST `/api/auth/logout` (invalida refresh token actual).

### 📥 Endpoints de Estadísticas
| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/_stats/visitas` | JWT | Snapshot día actual + histórico + mensual + geo + acumulado + visitLog parcial |
| GET | `/api/_stats/visitas/log` | JWT | Log completo (últimos registros hasta MAX) |
| POST | `/api/_stats/reset` | JWT | Reinicia contadores del día (para pruebas) |
| GET | `/api/_stats/integridad` | JWT | Revisión estructural del histórico (detección duplicados/corrupción) |
| POST | `/api/visit-beacon` | Público | Marca visita de usuario real (separada de llamadas técnicas) |

### 🗃 Estructura de Respuesta `/api/_stats/visitas` (Resumen)
```jsonc
{
  "version": "2.3.0",
  "fecha": "2025-08-24",
  "total": 123,            // Hits API hoy
  "unicos": 87,            // Visitantes únicos API hoy (IP+UA)
  "rutas": { "/api/prediccion": 90, "/api/current-weather": 33 },
  "siteVisitorsHoy": 55,   // Únicos reales (beacon)
  "siteHitsHoy": 60,
  "acumulado": { "total": 5432, "unicos": 2110 },
  "porMes": { "2025-08": { "total": 900, "unicos": 640 } },
  "geoHoy": { "porCiudad": { "Loja": 10 }, "porPais": { "Ecuador": 12 } },
  "geoHistorico": { ... },
  "visitLogLast": [ { "time": "2025-08-24T22:11:09Z", "hora": "17:11:09", "ruta": "/api/prediccion", "tipo": "api" } ],
  "visitLogMeta": { "total": 600, "last": 100, "placeholders": 0 }
}
```

### 🧾 Visit Log
- `tipo`: api | site | legacy
- `legacy` son placeholders para visitas antes de introducir timestamps precisos.
- Se recorta manteniendo las últimas `MAX_VISIT_LOG` (configurable por env).

### 🌐 Geolocalización
- Proveedor configurable (`ip-api`, `ipapi`, `ipwhois`).
- Cache en memoria 12h por IP.
- Cuenta únicos por ciudad y país usando sets en memoria (reseteo diario, histórico se consolida al rotar día).

### 🧮 Estrategia de Conteo
- Identificador único= IP + User-Agent.
- Contadores diarios reinician automáticamente (persistidos en `visitas-current.json`).
- `acumulado` NUNCA se reinicia (requisito del proyecto: “no quiero reset diario”).
- Día anterior se vuelca a `visitas-historico.json` al detectar cambio de fecha.

### ♻️ Persistencia
Archivos en `server/`:
- `visitas-current.json`: snapshot del día (incluye visitLog parcial, geo y acumulado).
- `visitas-historico.json`: histórico multi-día (cada día como clave ISO).
- `pronostico.json`: forecast evaluado (actualizado por tarea programada).

### ⏱ Cron / Actualización de Clima
`node-cron` ejecuta `actualizarDatosClima` cada 30 minutos (`0/30 * * * *`). Se carga una vez al iniciar.

### 📦 Caching y Eficiencia
- Debounce de persistencia (3s) para evitar escrituras excesivas.
- Reuso de geolocalización en memoria.
- Distinción llamadas técnicas vs vistas reales con `beacon`.

### 📊 Dashboard de Predicción Integrado
El dashboard ahora prioriza la predicción: hero con mejor día, badges de distribución de categorías, gráfico de puntajes, gráfico de capas de nubes, sparkline y tabla detallada (exportable CSV).

### 🛡 Consideraciones de Producción Futuras
- Migrar persistencia a base de datos (SQLite/Postgres) para evitar pérdida en despliegues transitorios.
- Paginación y filtros en visit log.
- Agregar rate limiting por IP a endpoints públicos.
- Auto-renovación de access token en dashboard (refresh silencioso).

### 🔧 Variables de Entorno Clave (Stats)
| Variable | Descripción | Default |
|----------|-------------|---------|
| `MAX_VISIT_LOG` | Máximo de registros en memoria | 20000 |
| `VISIT_LOG_LAST` | Cantidad a devolver en `visitLogLast` | 100 |
| `VISIT_LOG_PLACEHOLDER_CAP` | Máx placeholders generados en migración | 1000 |
| `GEO_PROVIDER` | Proveedor geolocalización | ip-api |

### 🧪 Ejemplos Rápidos (Stats)
```bash
curl -H "Authorization: Bearer <ACCESS>" https://<backend>/api/_stats/visitas | jq '.acumulado'
curl -H "Authorization: Bearer <ACCESS>" https://<backend>/api/_stats/visitas/log | jq '.data[0]'
curl -X POST -H "Authorization: Bearer <ACCESS>" https://<backend>/api/_stats/reset
```

---
## 🗂 Carpeta `stats-dashboard/`
| Archivo | Propósito |
|---------|-----------|
| `index.html` | Estructura UI + secciones (predicción, KPIs, geo, logs) |
| `script.js` | Fetch de APIs, render dinámico, charts, CSV export |
| `styles.css` | Tema ligero adaptable (claro/oscuro opcional) |
| `README.md` | Instrucciones de despliegue rápido |

---
## 🛡 Limitaciones y Advertencias
- Persistencia basada en filesystem: reinicios pueden perder el día en curso si no se guardó snapshot.
- Geo se basa en IP pública -> NAT / mobile carriers pueden sesgar datos.
- No se anonimiza IP (se mantiene sólo hash en sets en memoria, no se persiste la IP completa en histórico).

---
## 📌 Resumen del Valor Añadido
Predicción meteorológica especializada + observabilidad de uso (analytics) en un mismo repositorio con despliegues desacoplados y bajo costo operativo.
