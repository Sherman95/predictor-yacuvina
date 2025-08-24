import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import './styles/utilities.css';
import './styles/themes.css';
import './styles/typography.css';
import './styles/reduced-animations.css';

// --- IMPORTANDO COMPONENTES ---
import Header from './components/Header';
import Alert from './components/Alert';
import InfoSection from './components/InfoSection';
import ClimaActual from './components/ClimaActual';
import PronosticoSection from './components/PronosticoSection';
import Footer from './components/Footer';

// Imágenes y otras secciones estáticas
import imagen1 from './assets/yacuvina1.jpg';
import imagen2 from './assets/yacuvina2.jpg';
import imagen3 from './assets/yacuvina3.jpg';
import imagen4 from './assets/yacuvina4.png';
// Embed Google Maps / Street View (sin API key). Primero intentamos Street View 360° con el enlace proporcionado; si falla o está bloqueado usamos el mapa estándar.
const MAP_LAT = -3.57284828;
const MAP_LNG = -79.68927961;
// Enlace Street View original proporcionado por el usuario (vista 360 exacta)
const rawStreetViewLink = "https://www.google.com/maps/@-3.5728483,-79.6892796,3a,90y,337.15h,51.68t/data=!3m8!1e1!3m6!1sCIHM0ogKEICAgIC7kYKx_QE!2e10!3e11!6shttps:%2F%2Flh3.googleusercontent.com%2Fgpms-cs-s%2FAB8u6Hb2c2n7D_MmhmLjCDKXZ_RWIJ0CUXAM6ummSsDAp-YtBPfdweuhOumDFsehhuC3ubyY-CNgyRlg8_kTWbZ91HKJHEY3fLy68KbmmRNHy9gxP2arVWMHfBSTWyPeAzg_lymsvBk-kg%3Dw900-h600-k-no-pi38.322263135479254-ya337.15245327169305-ro0-fo100!7i4096!8i2048";
// Iframe oficial de Street View usa el endpoint /maps/embed con un parámetro pb codificado.
// Construimos pb manualmente a partir de: photoId, lat, lng, heading (y), pitch (t) y FOV fijo.
// Nota: Si Google cambia el formato, se puede reemplazar por un pb nuevo copiado desde "Compartir > Insertar un mapa".
const streetViewEmbedUrl = "https://www.google.com/maps/embed?pb=!4v0!6m8!1m7!1sCIHM0ogKEICAgIC7kYKx_QE!2m2!1d-3.5728483!2d-79.6892796!3f337.15!4f51.68!5f0.7820865974627469";
// Mapa fallback simple (por coordenadas)
const mapsEmbedUrl = `https://www.google.com/maps?q=${MAP_LAT},${MAP_LNG}&z=16&output=embed`;
const mapsExternalLink = rawStreetViewLink; // external link abre directamente la vista 360
// Fondo principal (ruta pública) para asegurar carga en iOS / producción
import wallpaper from '/yacuvinaWallpaper.jpg';
const imagenesYacuvina = [imagen1, imagen2, imagen3, imagen4];

// Componente embebido 360 (declaro antes de App para mantener orden)
function Vista360Section() {
  const [streetViewBlocked, setStreetViewBlocked] = useState(false);
  const [mapBlocked, setMapBlocked] = useState(false);
  const showStreetView = !streetViewBlocked;
  const showMap = streetViewBlocked && !mapBlocked;
  return (
    <section className="galeria-container vista360-container" aria-label="Vista 360° y mapa del columpio Tocando el Cielo">
      <h2>Vista 360° Tocando el Cielo</h2>
      <p className="vista360-descripcion">
        Vista inmersiva: si Google bloquea el iframe verás el mapa estándar; si también falla usa el enlace externo.
      </p>
      <div className="vista360-frame-wrapper">
        {showStreetView && (
          <iframe
            title="Street View 360 Columpio Tocando el Cielo"
            src={streetViewEmbedUrl}
            loading="lazy"
            allow="fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setStreetViewBlocked(true)}
          />
        )}
        {showMap && (
          <iframe
            title="Mapa Columpio Tocando el Cielo"
            src={mapsEmbedUrl}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setMapBlocked(true)}
          />
        )}
        {streetViewBlocked && mapBlocked && (
          <div className="vista360-fallback" role="alert">
            <p>No se pudo cargar la vista 360 ni el mapa (posible restricción corporativa / navegador). Abre el enlace directo.</p>
            <a href={mapsExternalLink} target="_blank" rel="noopener noreferrer" className="vista360-link alt">🗺 Abrir en Google Maps</a>
          </div>
        )}
      </div>
      <div className="vista360-actions secundario">
        <a href={mapsExternalLink} target="_blank" rel="noopener noreferrer" className="vista360-link" aria-label="Abrir en Google Maps vista 360">🗺 Abrir en Google Maps</a>
      </div>
      <noscript>
        <p>Activa JavaScript para ver la vista 360. <a href={mapsExternalLink} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a></p>
      </noscript>
    </section>
  );
}


function App() {
  const [pronostico, setPronostico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('yacuvina-theme') || 'theme-dark';
    } catch {
      return 'theme-dark';
    }
  });
  const [reduceAnim, setReduceAnim] = useState(() => {
    try { return localStorage.getItem('yacuvina-reduce-anim') === '1'; } catch { return false; }
  });

  // Aplicar clase de tema al <html> para que los overrides de variables funcionen globalmente
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(theme);
    try { localStorage.setItem('yacuvina-theme', theme); } catch {}
  }, [theme]);

  // Reduced animations toggle
  useEffect(() => {
    const root = document.documentElement;
    if (reduceAnim) root.classList.add('reduce-anim'); else root.classList.remove('reduce-anim');
    try { localStorage.setItem('yacuvina-reduce-anim', reduceAnim ? '1' : '0'); } catch {}
  }, [reduceAnim]);

  const toggleTheme = () => setTheme(t => t === 'theme-dark' ? 'theme-light' : 'theme-dark');
  const toggleReduceAnim = () => setReduceAnim(v => !v);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // Set dynamic CSS var for background (Vite reescribe path hashed si aplica)
  try { document.documentElement.style.setProperty('--yacuvina-bg', `url(${wallpaper})`); } catch {}
    // Diagnóstico: log si falla la carga del fondo
    setTimeout(() => {
      try {
        const cs = getComputedStyle(document.documentElement);
        // eslint-disable-next-line no-console
        console.log('[BG DIAG] --yacuvina-bg =', cs.getPropertyValue('--yacuvina-bg'));
        const layer = document.getElementById('bg-layer');
        if (layer) {
          // eslint-disable-next-line no-console
          console.log('[BG DIAG] layer background:', layer.style.background);
        }
      } catch {}
    }, 0);
    const fetchPronostico = () => {
      if (!cargando) {
        setIsRefreshing(true);
      }
      fetch(`${apiUrl}/api/prediccion`)
        .then(res => {
          if (!res.ok) throw new Error('No se pudo cargar el pronóstico.');
          return res.json();
        })
        .then(data => {
          setPronostico(data.forecast || []);
          setActualizado(new Date(data.lastUpdated));
        })
        .catch(err => setError(err.message))
        .finally(() => {
          setCargando(false);
          setIsRefreshing(false);
        });
    };
    fetchPronostico();
    const intervalId = setInterval(fetchPronostico, 3600 * 1000);
    return () => clearInterval(intervalId);
  }, [cargando]);

  // Beacon de visita (una vez por día por dispositivo/navegador)
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const key = 'yacuvina-last-beacon';
    const hoy = new Date().toISOString().slice(0,10);
    let ultima = null;
    try { ultima = localStorage.getItem(key); } catch {}
    if (ultima === hoy) return; // ya enviado hoy
    const url = `${apiUrl}/api/visit-beacon`;
    const send = () => {
      if (navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ t: Date.now() })], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
          try { localStorage.setItem(key, hoy); } catch {}
          return;
        } catch {}
      }
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: Date.now() }) })
        .then(() => { try { localStorage.setItem(key, hoy); } catch {} })
        .catch(() => {});
    };
    send();
  }, []);

  const mejorDia = useMemo(() => {
    if (!pronostico || pronostico.length === 0) return null;
    
    // Buscar el día con mayor puntaje numérico (nuevo algoritmo Yacuviña 3.0)
    let mejorDiaEncontrado = null;
    let mejorPuntaje = -1;
    
    pronostico.forEach(dia => {
      // Priorizar días con puntaje numérico si está disponible
      if (dia.puntajeNumerico !== undefined && dia.puntajeNumerico > mejorPuntaje) {
        mejorPuntaje = dia.puntajeNumerico;
        mejorDiaEncontrado = dia;
      }
    });
    
    // Si encontramos un día con puntaje numérico, devolverlo
    if (mejorDiaEncontrado && mejorPuntaje >= 50) {
      return mejorDiaEncontrado;
    }
    
    // Fallback al método anterior si no hay puntajes numéricos
    const ideal = pronostico.find(d => d.prediccion.includes("Ideal") || d.prediccion.includes("Perfecto"));
    if (ideal) return ideal;
    const excelente = pronostico.find(d => d.prediccion === "Excelente");
    if (excelente) return excelente;
    const bueno = pronostico.find(d => d.prediccion === "Bueno");
    if (bueno) return bueno;
    
    return null;
  }, [pronostico]);

  return (
    <div className="app-container" data-theme={theme}>
      {/* Capa de fondo dedicada para iOS/Safari que ignora background-attachment issues */}
      <div id="bg-layer" aria-hidden="true"></div>
      {/* ===== INICIO DEL BLOQUE CORREGIDO ===== */}
      {imagenSeleccionada && (
        <div className="visor-overlay" onClick={() => setImagenSeleccionada(null)}>
          <button className="visor-cerrar" onClick={() => setImagenSeleccionada(null)}>×</button>
          <img 
            src={imagenSeleccionada} 
            alt="Visor de imagen" 
            className="visor-imagen"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* ===== FIN DEL BLOQUE CORREGIDO ===== */}
      
  <Header actualizado={actualizado} isRefreshing={isRefreshing} />
      <InfoSection />
      
      {/* 🌤️ CLIMA ACTUAL DE YACUVIÑA */}
  <div aria-live="polite" aria-busy={cargando ? 'true' : 'false'}>
        <ClimaActual />
      </div>
      
      <section aria-live="polite" aria-busy={cargando ? 'true' : 'false'}>
  {error && <Alert type="error" message={error} />}
        <PronosticoSection 
          cargando={cargando}
          error={error}
          pronostico={pronostico}
          mejorDia={mejorDia}
        />
      </section>

  {/* Vista 360° – Columpio Tocando el Cielo (iframe embebido con fallback) */}
  <Vista360Section />

      {/* Aquí puedes seguir componentizando las secciones estáticas si quieres */}
      <section className="actividades-container">
        <h2>Actividades Destacadas</h2>
        <ul>
          <li>Camina por senderos arqueológicos (1-2 h).</li>
          <li>Sube al columpio “Tocando el Cielo” por ∼USD 3.</li>
          <li>Captura vistas épicas del paisaje y el mar de nubes.</li>
        </ul>
      </section>
      
      <section className="galeria-container">
        <h2>Galería de Yacuviña</h2>
        
        <div className="galeria-grid">
          {imagenesYacuvina.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Imagen de Yacuviña ${index + 1}`}
              className="galeria-img"
              onClick={() => setImagenSeleccionada(url)}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default App;