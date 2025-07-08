import React from 'react';

// Esta función para determinar el color de la tarjeta ahora vive aquí.
const getCardColor = (prediccion) => {
    if (prediccion.startsWith("Excelente") || prediccion.startsWith("Mar de Nubes Ideal") || prediccion.startsWith("Atardecer Perfecto")) return 'card-excelente';
    if (prediccion.startsWith("Bueno")) return 'card-bueno';
    if (prediccion.startsWith("Regular")) return 'card-regular';
    if (prediccion.startsWith("Malo")) return 'card-malo';
    return '';
};

// El componente recibe los datos de un 'dia' como prop
function PronosticoCard({ dia }) {
  if (!dia) return null;

  return (
    <div className={`card ${getCardColor(dia.prediccion)}`}>
      <h2>{dia.diaSemana}</h2>
      <p className="fecha">{dia.fecha}</p>
      <img 
        className="weather-icon" 
        src={`http://openweathermap.org/img/wn/${dia.icono}@2x.png`} 
        alt={`Icono del clima: ${dia.prediccion}`} 
      />
      <p className="prediccion-texto">{dia.prediccion}</p>
      {dia.razon && <p className="razon-texto">{dia.razon}</p>}
      <div className="detalles">
        <p><span>Temp:</span> {dia.temperatura}°C</p>
        <p><span>Atardecer:</span> {dia.horaAtardecer}</p>
      </div>
      <div className="confianza">
        <span>Confianza: <strong>{dia.confianza}%</strong></span>
      </div>
    </div>
  );
}

export default PronosticoCard;