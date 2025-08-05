import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// --- IMPORTANDO COMPONENTES ---
import Header from './components/Header';
import InfoSection from './components/InfoSection';
import ClimaActual from './components/ClimaActual';
import PronosticoSection from './components/PronosticoSection';
import Footer from './components/Footer';

// Imágenes y otras secciones estáticas
import imagen1 from './assets/yacuvina1.jpg';
import imagen2 from './assets/yacuvina2.jpg';
import imagen3 from './assets/yacuvina3.jpg';
import imagen4 from './assets/yacuvina4.png';
const imagenesYacuvina = [imagen1, imagen2, imagen3, imagen4];


function App() {
  // --- TODA LA LÓGICA Y ESTADO VUELVEN AL COMPONENTE PADRE ---
  const [pronostico, setPronostico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
    <div className="app-container">
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
      <ClimaActual />
      
      <PronosticoSection 
        cargando={cargando}
        error={error}
        pronostico={pronostico}
        mejorDia={mejorDia}
      />

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
            />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default App;