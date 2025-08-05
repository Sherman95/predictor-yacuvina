import React from 'react';

// Obtener ícono personalizado para tipo de atardecer
const getTipoAtardecerInfo = (tipo) => {
  if (tipo === "Mar de Nubes") {
    return { icon: "icon-mar-nubes-large", symbol: "☁", descripcion: "Vista espectacular desde arriba de las nubes", color: "#20c997" };
  } else if (tipo === "Atardecer Despejado") {
    return { icon: "icon-atardecer-despejado-large", symbol: "☀", descripcion: "Vista panorámica cristalina del valle", color: "#ffc107" };
  }
  return { icon: "icon-mixto-large", symbol: "◐", descripcion: "Condiciones favorables", color: "#6c757d" };
};

function MejorDiaBanner({ mejorDia }) {
  if (!mejorDia) {
    return (
      <div className="mejor-dia-banner sin-recomendacion">
        <h3><span className="icon-analysis"></span> Analizando Condiciones</h3>
        <p>No hay días especialmente recomendados esta semana</p>
        <span>Revisa las predicciones individuales para más detalles</span>
      </div>
    );
  }

  const tipoInfo = getTipoAtardecerInfo(mejorDia.tipoAtardecer);

  return (
    <div className="mejor-dia-banner">
      <h3><span className="icon-recommendation"></span> Mejor Día para Ir</h3>
      <div className="mejor-dia-info">
        <div className="mejor-dia-fecha">
          <span className="dia-semana">{mejorDia.diaSemana}</span>
          <span className="dia-numero">{mejorDia.fecha}</span>
        </div>
        
        {mejorDia.tipoAtardecer && (
          <div className="tipo-atardecer-banner" style={{ color: tipoInfo.color }}>
            <span className={`sunset-icon-large ${tipoInfo.icon}`}>
              <span className="icon-symbol">{tipoInfo.symbol}</span>
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
          <span><span className="icon-temperature"></span> {mejorDia.temperatura}°C</span>
          <span><span className="icon-time"></span> Atardecer: {mejorDia.horaAtardecer}</span>
          <span><span className="icon-target"></span> Confianza: {mejorDia.confianza}%</span>
        </div>
      </div>
    </div>
  );
}

export default MejorDiaBanner;