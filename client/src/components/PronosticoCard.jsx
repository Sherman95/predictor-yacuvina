import React, { useState } from 'react';

// Función para determinar el color de la tarjeta optimizada para desktop
const getCardColor = (prediccion) => {
    if (prediccion.startsWith("Excelente") || prediccion.startsWith("Mar de Nubes Ideal") || prediccion.startsWith("Atardecer Perfecto")) return 'card-excelente';
    if (prediccion.startsWith("Bueno")) return 'card-bueno';
    if (prediccion.startsWith("Regular")) return 'card-regular';
    if (prediccion.startsWith("Muy Malo")) return 'card-muy-malo';
    if (prediccion.startsWith("Malo")) return 'card-malo';
    return '';
};

// Obtener emoji para tipo de atardecer (optimizado para desktop)
const getTipoAtardecerInfo = (tipo) => {
    if (tipo === "Mar de Nubes") {
        return { emoji: "☁️", descripcion: "Vista desde arriba de las nubes", color: "#20c997" };
    } else if (tipo === "Atardecer Despejado") {
        return { emoji: "🌅", descripcion: "Vista panorámica del valle", color: "#ffc107" };
    }
    return { emoji: "🌤️", descripcion: "Condiciones mixtas", color: "#6c757d" };
};

// Componente optimizado para desktop
function PronosticoCard({ dia }) {
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  
  if (!dia) return null;

  const tipoInfo = getTipoAtardecerInfo(dia.tipoAtardecer);

  return (
  <div className={`card forecast-card ${getCardColor(dia.prediccion)}`}>
      <h2>{dia.diaSemana}</h2>
      <p className="fecha">{dia.fecha}</p>
      
      {/* Tipo de atardecer con emoji optimizado */}
      {dia.tipoAtardecer && (
        <div className="tipo-atardecer" style={{ color: tipoInfo.color }}>
          <span className="emoji-icon" style={{ fontSize: '2.5rem', marginRight: '0.8rem' }}>
            {tipoInfo.emoji}
          </span>
          <span className="tipo-texto">{dia.tipoAtardecer}</span>
        </div>
      )}
      
      <img 
        className="weather-icon" 
        src={`http://openweathermap.org/img/wn/${dia.icono}@2x.png`} 
        alt={`Icono del clima: ${dia.prediccion}`} 
      />
      
      <p className="prediccion-texto">{dia.prediccion}</p>
      
      {dia.puntajeNumerico && (
        <div className="puntaje-numerico">
          <span>{dia.puntajeNumerico}/100</span>
        </div>
      )}
      
      {dia.razon && <p className="razon-texto">{dia.razon}</p>}
      
  {/* Métricas avanzadas ahora solo dentro de detalles expandido */}
      
      {/* Botón para ver más detalles desktop */}
      <button 
        className="btn-primary ver-detalles-btn" 
        onClick={() => setMostrarDetalles(!mostrarDetalles)}
        aria-expanded={mostrarDetalles}
        aria-label={mostrarDetalles ? 'Ocultar detalles del día' : 'Mostrar detalles del día'}
        type="button"
        style={{ width: '100%' }}
      >
        {mostrarDetalles ? '▼ Menos detalles' : '▶ Más detalles'}
      </button>
      
      {/* Panel de detalles expandible optimizado para desktop */}
      {mostrarDetalles && (
        <div className="detalles-expandidos panel-expandido">
          <div className="metric-chips" aria-label="Métricas detalladas del día">
            {dia.temperatura !== undefined && (
              <div className="metric-chip metric-temp" aria-label={`Temperatura ${dia.temperatura} grados Celsius`}>
                <span className="metric-icon">🌡️</span>
                <div className="metric-info">
                  <span className="metric-value">{dia.temperatura}°C</span>
                  <span className="metric-label">Temp</span>
                </div>
              </div>
            )}
            {dia.horaAtardecer && (
              <div className="metric-chip metric-sunset" aria-label={`Hora de atardecer ${dia.horaAtardecer}`}>
                <span className="metric-icon">🌇</span>
                <div className="metric-info">
                  <span className="metric-value" data-small>{dia.horaAtardecer}</span>
                  <span className="metric-label">Atardecer</span>
                </div>
              </div>
            )}
            {dia.humedad !== undefined && (
              <div className="metric-chip metric-humidity" aria-label={`Humedad relativa ${dia.humedad}%`}>
                <span className="metric-icon">💧</span>
                <div className="metric-info">
                  <span className="metric-value">{dia.humedad}%</span>
                  <span className="metric-label">Humedad</span>
                  <div className="metric-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={dia.humedad}>
                    <div className="metric-bar-fill" style={{ width: `${Math.min(100, Math.max(0, dia.humedad))}%` }} />
                  </div>
                </div>
              </div>
            )}
            {dia.viento !== undefined && (
              <div className="metric-chip metric-wind" aria-label={`Viento ${dia.viento} kilómetros por hora`}>
                <span className="metric-icon">💨</span>
                <div className="metric-info">
                  <span className="metric-value">{dia.viento} km/h</span>
                  <span className="metric-label">Viento</span>
                  <div className="metric-badge wind-badge">{dia.viento <= 10 ? 'Suave' : dia.viento <= 20 ? 'Moderado' : dia.viento <= 30 ? 'Fuerte' : 'Muy Fuerte'}</div>
                </div>
              </div>
            )}
          </div>
          <div className="detalles-grid grid-expandido">
            {dia.visibilidad && (
              <div className="detalle-item detalle-extra">
                <span className="detalle-emoji">👁️</span>
                <span className="detalle-valor-extra">{dia.visibilidad} km</span>
                <span className="detalle-label-extra">Visibilidad</span>
              </div>
            )}
            {dia.uvIndex !== undefined && (
              <div className="detalle-item detalle-extra">
                <span className="detalle-emoji">☀️</span>
                <span className="detalle-valor-extra">{dia.uvIndex}</span>
                <span className="detalle-label-extra">Índice UV</span>
              </div>
            )}
          </div>
          
          {/* Información de nubes optimizada para desktop */}
          {(dia.nubesBajas || dia.nubesMedias || dia.nubesAltas) && (
            <div className="nubes-info" style={{ marginTop: '20px' }}>
              <h4 style={{ 
                fontSize: '1.3rem', 
                color: 'var(--text-super-bright)', 
                textAlign: 'center', 
                marginBottom: '15px', 
                fontWeight: '700' 
              }}>Cobertura de Nubes</h4>
              <div className="nubes-barras">
                {dia.nubesBajas !== undefined && (
                  <div className="nube-barra nube-line">
                    <span className="nube-label">Bajas:</span>
                    <div className="nube-progress nube-track">
                      <div 
                        className="nube-fill" 
                        style={{ width: `${dia.nubesBajas}%` }}
                      ></div>
                    </div>
                    <span className="nube-valor nube-valor-extra">{dia.nubesBajas}%</span>
                  </div>
                )}
                {dia.nubesMedias !== undefined && (
                  <div className="nube-barra nube-line">
                    <span className="nube-label">Medias:</span>
                    <div className="nube-progress nube-track">
                      <div 
                        className="nube-fill" 
                        style={{ width: `${dia.nubesMedias}%` }}
                      ></div>
                    </div>
                    <span className="nube-valor nube-valor-extra">{dia.nubesMedias}%</span>
                  </div>
                )}
                {dia.nubesAltas !== undefined && (
                  <div className="nube-barra nube-line">
                    <span className="nube-label">Altas:</span>
                    <div className="nube-progress nube-track">
                      <div 
                        className="nube-fill" 
                        style={{ width: `${dia.nubesAltas}%` }}
                      ></div>
                    </div>
                    <span className="nube-valor nube-valor-extra">{dia.nubesAltas}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="confianza">
        <span>Confianza: <strong>{dia.confianza}%</strong></span>
      </div>
    </div>
  );
}

export default PronosticoCard;