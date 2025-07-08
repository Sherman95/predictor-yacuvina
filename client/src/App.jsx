import { useState, useEffect, useMemo } from 'react';
import './App.css';

// Importando los nuevos componentes
import Header from './components/Header';
import InfoSection from './components/InfoSection';
import MejorDiaBanner from './components/MejorDiaBanner';
import PronosticoCard from './components/PronosticoCard';

// Las imágenes se quedan aquí por ahora
import imagen1 from './assets/yacuvina1.jpg';
import imagen2 from './assets/yacuvina2.jpg';
import imagen3 from './assets/yacuvina3.jpg';
import imagen4 from './assets/yacuvina4.png';
const imagenesYacuvina = [imagen1, imagen2, imagen3, imagen4];


function App() {
  // --- ESTADO ---
  const [pronostico, setPronostico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // Estado para la actualización sutil

  // --- LÓGICA ---
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    const fetchPronostico = () => {
      // No usamos el 'cargando' principal para las actualizaciones, solo el de refrescar
      if (!cargando) {
        setIsRefreshing(true);
      }

      fetch(`${apiUrl}/api/prediccion`)
        .then(res => {
          if (!res.ok) throw new Error('No se pudo obtener la respuesta del servidor');
          return res.json();
        })
        .then(data => {
          setPronostico(data.forecast);
          setActualizado(new Date(data.lastUpdated));
        })
        .catch(err => setError(err.message))
        .finally(() => {
          // Nos aseguramos de que ambos estados de carga terminen
          setCargando(false);
          setIsRefreshing(false);
        });
    };

    fetchPronostico(); // Primera carga
    const intervalId = setInterval(fetchPronostico, 3600 * 1000); // Refrescar cada hora
    return () => clearInterval(intervalId);
  }, []); // El array vacío asegura que se configure solo una vez

  const mejorDia = useMemo(() => {
    if (!pronostico || pronostico.length === 0) return null;
    const ideal = pronostico.find(d => d.prediccion.includes("Ideal") || d.prediccion.includes("Perfecto"));
    if (ideal) return ideal;
    const excelente = pronostico.find(d => d.prediccion === "Excelente");
    if (excelente) return excelente;
    const bueno = pronostico.find(d => d.prediccion === "Bueno");
    if (bueno) return bueno;
    return null;
  }, [pronostico]);

  // --- RENDERIZADO ---
  if (cargando) return <div className="loading">Cargando pronóstico...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="app-container">
      {/* Visor de imágenes */}
      {imagenSeleccionada && (
        <div className="visor-overlay" onClick={() => setImagenSeleccionada(null)}>
          <button className="visor-cerrar">×</button>
          <img src={imagenSeleccionada} alt="Visor de imagen" className="visor-imagen" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      
      {/* Composición de la UI con los nuevos componentes y props */}
      <Header actualizado={actualizado} isRefreshing={isRefreshing} />
      <InfoSection />
      <MejorDiaBanner mejorDia={mejorDia} />

      <div className="pronostico-grid">
        {pronostico.map((dia, index) => (
          <PronosticoCard key={dia.fecha || index} dia={dia} /> // Usamos una key más estable
        ))}
      </div>

      {/* Secciones Estáticas */}
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
            <img key={index} src={url} alt={`Imagen de Yacuviña ${index + 1}`} className="galeria-img" onClick={() => setImagenSeleccionada(url)} />
          ))}
        </div>
      </section>

      <footer className="footer">
        {/* Aquí puedes añadir tu componente Footer si lo creas */}
      </footer>
    </div>
  );
}

export default App;