import React from 'react';

// Obtener emoji para tipo de atardecer (sin iconos, solo emojis)
const getTipoAtardecerInfo = (tipo) => {
  if (tipo === "Mar de Nubes") {
    return { emoji: "☁️", descripcion: "Vista espectacular desde arriba de las nubes", color: "#20c997" };
  } else if (tipo === "Atardecer Despejado") {
    return { emoji: "🌅", descripcion: "Vista panorámica cristalina del valle", color: "#ffc107" };
  }
  return { emoji: "🌤️", descripcion: "Condiciones favorables", color: "#6c757d" };
};

function MejorDiaBanner({ mejorDia }) {
  if (!mejorDia) {
    return (
      <div className="mejor-dia-banner sin-recomendacion">
        <h3><span style={{marginRight: '0.5rem'}}>🔍</span> Analizando Condiciones</h3>
        <p>No hay días especialmente recomendados esta semana</p>
        <span>Revisa las predicciones individuales para más detalles</span>
      </div>
    );
  }

  const tipoInfo = getTipoAtardecerInfo(mejorDia.tipoAtardecer);

  return (
    <div className="mejor-dia-banner">
      <h3><span style={{marginRight: '0.5rem'}}>⭐</span> Mejor Día para Ir</h3>
      <div className="mejor-dia-info">
        <div className="mejor-dia-fecha">
          <span className="dia-semana">{mejorDia.diaSemana}</span>
          <span className="dia-numero">{mejorDia.fecha}</span>
        </div>
        
        {mejorDia.tipoAtardecer && (
          <div className="tipo-atardecer-banner" style={{ color: tipoInfo.color }}>
            <span style={{ fontSize: '3rem', marginRight: '1rem' }}>
              {tipoInfo.emoji}
            </span>
            <span className="tipo-descripcion">{tipoInfo.descripcion}</span>
          </div>
        )}
        
        <div className="prediccion-destaque">
          <span className="prediccion-valor">{mejorDia.prediccion}</span>
          {mejorDia.puntajeNumerico && (
            <span className="puntaje-destaque">{mejorDia.puntajeNumerico}/100</span>
          )}
        </div>
        
        <div className="detalles-banner">
          <span><span style={{marginRight: '0.3rem'}}>🌡️</span> {mejorDia.temperatura}°C</span>
          <span><span style={{marginRight: '0.3rem'}}>🕕</span> Atardecer: {mejorDia.horaAtardecer}</span>
          <span><span style={{marginRight: '0.3rem'}}>🎯</span> Confianza: {mejorDia.confianza}%</span>
        </div>
      </div>
    </div>
  );
}

export default MejorDiaBanner;