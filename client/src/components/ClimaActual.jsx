import React, { useState, useEffect } from 'react';

const ClimaActual = () => {
  const [climaActual, setClimaActual] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const fetchClimaActual = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/current-weather`);
      
      if (!response.ok) {
        throw new Error('No se pudo obtener el clima actual');
      }

      const data = await response.json();
      
      if (data.success) {
        setClimaActual(data.data);
        setUltimaActualizacion(new Date());
        setError(null);
      } else {
        throw new Error(data.message || 'Error al obtener datos');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error al obtener clima actual:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchClimaActual();
    
    // Actualizar cada 5 minutos para mostrar datos frescos
    const interval = setInterval(fetchClimaActual, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const obtenerIconoClima = (icono, descripcion) => {
    if (icono) {
      return `https://openweathermap.org/img/wn/${icono}@2x.png`;
    }
    
    // Iconos de fallback basados en descripción
    const desc = descripcion?.toLowerCase() || '';
    if (desc.includes('despejado') || desc.includes('clear')) return '☀️';
    if (desc.includes('nubes') || desc.includes('cloud')) return '☁️';
    if (desc.includes('lluvia') || desc.includes('rain')) return '🌧️';
    if (desc.includes('niebla') || desc.includes('fog') || desc.includes('mist')) return '🌫️';
    if (desc.includes('tormenta') || desc.includes('storm')) return '⛈️';
    return '🌤️';
  };

  const obtenerColorEvaluacion = (categoria) => {
    switch (categoria?.toLowerCase()) {
      case 'excelente': return '#4CAF50';
      case 'bueno': return '#8BC34A';
      case 'regular': return '#FF9800';
      case 'malo': return '#FF5722';
      case 'muy malo': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const obtenerIconoViento = (velocidad) => {
    if (velocidad <= 10) return '🍃'; // Viento suave
    if (velocidad <= 20) return '💨'; // Viento moderado
    if (velocidad <= 30) return '🌬️'; // Viento fuerte
    return '🌪️'; // Viento muy fuerte
  };

  const obtenerDescripcionViento = (velocidad) => {
    if (velocidad <= 10) return 'Suave';
    if (velocidad <= 20) return 'Moderado';
    if (velocidad <= 30) return 'Fuerte';
    return 'Muy fuerte';
  };

  if (cargando) {
    return (
      <div className="clima-actual-container loading">
        <div className="clima-loading">
          <div className="loading-spinner-clima"></div>
          <p>Obteniendo clima actual...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clima-actual-container error">
        <div className="clima-error">
          <span className="error-icon">⚠️</span>
          <h3>Error al cargar clima</h3>
          <p>{error}</p>
          <button onClick={fetchClimaActual} className="retry-button">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!climaActual) {
    return null;
  }

  const { evaluacionYacuvina } = climaActual;

  return (
    <div className="clima-actual-container">
      <div className="clima-actual-card">
        {/* Header del clima actual */}
        <div className="clima-header">
          <div className="clima-titulo">
            <h3>🌤️ Clima Actual en Yacuviña</h3>
            <div className="clima-ubicacion">
              <span className="icono-ubicacion">📍</span>
              <span>{climaActual.nombreLugar || 'Yacuviña'}</span>
            </div>
          </div>
          
          <div className="clima-hora">
            <p className="fecha-actual">{climaActual.fechaLocal}</p>
            <p className="cache-info">
              {climaActual.esCache ? (
                <span className="cache-badge">📦 Caché</span>
              ) : (
                <span className="fresh-badge">🔄 Actualizado</span>
              )}
            </p>
          </div>
        </div>

        {/* Información principal del clima */}
        <div className="clima-principal">
          <div className="temperatura-principal">
            <img 
              src={obtenerIconoClima(climaActual.icono, climaActual.descripcion)}
              alt={climaActual.descripcion}
              className="icono-clima-principal"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline';
              }}
            />
            <span className="emoji-fallback" style={{ display: 'none' }}>
              {obtenerIconoClima(null, climaActual.descripcion)}
            </span>
            
            <div className="temperatura-info">
              <span className="temperatura-valor">{climaActual.temperatura}°C</span>
              <span className="temperatura-sensacion">
                Sensación: {climaActual.sensacionTermica}°C
              </span>
              <span className="descripcion-clima">{climaActual.descripcion}</span>
            </div>
          </div>

          {/* Evaluación para Yacuviña */}
          <div className="evaluacion-yacuvina">
            <div 
              className="evaluacion-badge"
              style={{ 
                backgroundColor: obtenerColorEvaluacion(evaluacionYacuvina.categoria),
                color: 'white'
              }}
            >
              <span className="evaluacion-categoria">{evaluacionYacuvina.categoria}</span>
              <span className="evaluacion-puntaje">{evaluacionYacuvina.puntuacion}/100</span>
            </div>
            <p className="evaluacion-recomendacion">{evaluacionYacuvina.recomendacion}</p>
          </div>
        </div>

        {/* Detalles del clima */}
        <div className="clima-detalles">
          <div className="detalle-grid">
            <div className="detalle-item">
              <span className="detalle-icono">💧</span>
              <div className="detalle-info">
                <span className="detalle-valor">{climaActual.humedad}%</span>
                <span className="detalle-label">Humedad</span>
              </div>
            </div>

            <div className="detalle-item">
              <span className="detalle-icono">{obtenerIconoViento(climaActual.velocidadViento)}</span>
              <div className="detalle-info">
                <span className="detalle-valor">{climaActual.velocidadViento} km/h</span>
                <span className="detalle-label">Viento {obtenerDescripcionViento(climaActual.velocidadViento)}</span>
              </div>
            </div>

            <div className="detalle-item">
              <span className="detalle-icono">👁️</span>
              <div className="detalle-info">
                <span className="detalle-valor">{climaActual.visibilidad} km</span>
                <span className="detalle-label">Visibilidad</span>
              </div>
            </div>

            <div className="detalle-item">
              <span className="detalle-icono">☁️</span>
              <div className="detalle-info">
                <span className="detalle-valor">{climaActual.nubosidad}%</span>
                <span className="detalle-label">Nubosidad</span>
              </div>
            </div>

            <div className="detalle-item">
              <span className="detalle-icono">🌡️</span>
              <div className="detalle-info">
                <span className="detalle-valor">{climaActual.presion} hPa</span>
                <span className="detalle-label">Presión</span>
              </div>
            </div>

            {climaActual.uvIndex && (
              <div className="detalle-item">
                <span className="detalle-icono">☀️</span>
                <div className="detalle-info">
                  <span className="detalle-valor">{climaActual.uvIndex}</span>
                  <span className="detalle-label">Índice UV</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Factores de evaluación */}
        {evaluacionYacuvina.factoresPositivos?.length > 0 && (
          <div className="factores-evaluacion">
            <h4>✅ Factores Positivos</h4>
            <ul className="factores-lista positivos">
              {evaluacionYacuvina.factoresPositivos.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {evaluacionYacuvina.factoresNegativos?.length > 0 && (
          <div className="factores-evaluacion">
            <h4>⚠️ Factores a Considerar</h4>
            <ul className="factores-lista negativos">
              {evaluacionYacuvina.factoresNegativos.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer con información de actualización */}
        <div className="clima-footer">
          <div className="fuente-info">
            <span className="fuente-badge">📡 {climaActual.fuente || 'API'}</span>
            <span className="proxima-actualizacion">
              Próxima actualización: {climaActual.proximaActualizacion}
            </span>
          </div>
          
          <button 
            onClick={fetchClimaActual} 
            className="actualizar-button"
            disabled={cargando}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClimaActual;
