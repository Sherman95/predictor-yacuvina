import React from 'react';
import MejorDiaBanner from './MejorDiaBanner';
import PronosticoCard from './PronosticoCard';

// Este componente ahora es "tonto", solo recibe props y renderiza.
function PronosticoSection({ cargando, error, pronostico, mejorDia }) {
  
  if (cargando) {
    return (
      <div className="pronostico-placeholder">
        <div className="loading-spinner"></div>
        Buscando el mejor atardecer...
      </div>
    );
  }

  if (error) {
    return (
      <div className="pronostico-error">
        ⚠️ Estamos presentando problemas para cargar el pronóstico. Por favor, intenta de nuevo más tarde.
      </div>
    );
  }

  return (
    <>
      <MejorDiaBanner mejorDia={mejorDia} />
      <div className="pronostico-grid">
        {pronostico.map((dia, index) => (
          <PronosticoCard key={dia.fecha || index} dia={dia} />
        ))}
      </div>
    </>
  );
}

export default PronosticoSection;