import React from 'react';

function MejorDiaBanner({ mejorDia }) {
  if (!mejorDia) return null;

  return (
    <div className="mejor-dia-banner">
      <h3>Mejor Día para Ir</h3>
      <p>{mejorDia.diaSemana}, {mejorDia.fecha}</p>
      <span>Predicción: {mejorDia.prediccion}</span>
    </div>
  );
}

export default MejorDiaBanner;