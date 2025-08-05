import React, { useState } from 'react';

// Esta función para determinar el color de la tarjeta ahora vive aquí.
const getCardColor = (prediccion) => {
    if (prediccion.startsWith("Excelente") || prediccion.startsWith("Mar de Nubes Ideal") || prediccion.startsWith("Atardecer Perfecto")) return 'card-excelente';
    if (prediccion.startsWith("Bueno")) return 'card-bueno';
    if (prediccion.startsWith("Regular")) return 'card-regular';
    if (prediccion.startsWith("Muy Malo")) return 'card-muy-malo';
    if (prediccion.startsWith("Malo")) return 'card-malo';
    return '';
};

// Obtener ícono personalizado para tipo de atardecer
const getTipoAtardecerInfo = (tipo) => {
    if (tipo === "Mar de Nubes") {
        return { icon: "icon-mar-nubes", symbol: "☁", descripcion: "Vista desde arriba de las nubes", color: "#20c997" };
    } else if (tipo === "Atardecer Despejado") {
        return { icon: "icon-atardecer-despejado", symbol: "☀", descripcion: "Vista panorámica del valle", color: "#ffc107" };
    }
    return { icon: "icon-mixto", symbol: "◐", descripcion: "Condiciones mixtas", color: "#6c757d" };
};

// El componente recibe los datos de un 'dia' como prop
function PronosticoCard({ dia }) {
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  
  if (!dia) return null;

  const tipoInfo = getTipoAtardecerInfo(dia.tipoAtardecer);

  return (
    <div className={`card ${getCardColor(dia.prediccion)}`}>
      <h2>{dia.diaSemana}</h2>
      <p className="fecha">{dia.fecha}</p>
      
      {/* Tipo de atardecer con ícono personalizado */}
      {dia.tipoAtardecer && (
        <div className="tipo-atardecer" style={{ color: tipoInfo.color }}>
          <span className={`sunset-icon ${tipoInfo.icon}`}>
            <span className="icon-symbol">{tipoInfo.symbol}</span>
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
      
      <div className="detalles">
        <p><span>Temp:</span> {dia.temperatura}°C</p>
        <p><span>Atardecer:</span> {dia.horaAtardecer}</p>
      </div>
      
      {/* Botón para ver más detalles */}
      <button 
        className="ver-detalles-btn" 
        onClick={() => setMostrarDetalles(!mostrarDetalles)}
        aria-expanded={mostrarDetalles}
      >
        {mostrarDetalles ? '▼ Menos detalles' : '▶ Más detalles'}
      </button>
      
      {/* Panel de detalles expandible */}
      {mostrarDetalles && (
        <div className="detalles-expandidos">
          <div className="detalles-grid">
            {dia.humedad !== undefined && (
              <div className="detalle-item">
                <span className="detalle-icono icon-humedad"></span>
                <span className="detalle-valor">{dia.humedad}%</span>
                <span className="detalle-label">Humedad</span>
              </div>
            )}
            {dia.viento !== undefined && (
              <div className="detalle-item">
                <span className="detalle-icono icon-viento"></span>
                <span className="detalle-valor">{dia.viento} km/h</span>
                <span className="detalle-label">Viento</span>
              </div>
            )}
            {dia.visibilidad && (
              <div className="detalle-item">
                <span className="detalle-icono icon-visibilidad"></span>
                <span className="detalle-valor">{dia.visibilidad} km</span>
                <span className="detalle-label">Visibilidad</span>
              </div>
            )}
            {dia.uvIndex !== undefined && (
              <div className="detalle-item">
                <span className="detalle-icono icon-uv"></span>
                <span className="detalle-valor">{dia.uvIndex}</span>
                <span className="detalle-label">Índice UV</span>
              </div>
            )}
          </div>
          
          {/* Información de nubes */}
          <div className="nubes-info">
            <h4>Cobertura de Nubes</h4>
            <div className="nubes-barras">
              <div className="nube-barra">
                <span className="nube-label">Bajas:</span>
                <div className="nube-progress">
                  <div 
                    className="nube-fill nube-baja" 
                    style={{ width: `${dia.nubesBajas || 0}%` }}
                  ></div>
                </div>
                <span className="nube-valor">{dia.nubesBajas || 0}%</span>
              </div>
              <div className="nube-barra">
                <span className="nube-label">Medias:</span>
                <div className="nube-progress">
                  <div 
                    className="nube-fill nube-media" 
                    style={{ width: `${dia.nubesMedias || 0}%` }}
                  ></div>
                </div>
                <span className="nube-valor">{dia.nubesMedias || 0}%</span>
              </div>
              <div className="nube-barra">
                <span className="nube-label">Altas:</span>
                <div className="nube-progress">
                  <div 
                    className="nube-fill nube-alta" 
                    style={{ width: `${dia.nubesAltas || 0}%` }}
                  ></div>
                </div>
                <span className="nube-valor">{dia.nubesAltas || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="confianza">
        <span>Confianza: <strong>{dia.confianza}%</strong></span>
      </div>
    </div>
  );
}

export default PronosticoCard;