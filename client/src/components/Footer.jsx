import React from 'react';

// Iconos SVG para un look limpio sin librerías externas
const GitHubIcon = () => (
  <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
);

const MailIcon = () => (
    <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"></path></svg>
);

function Footer() {
  return (
    <footer className="footer-detallado">
      <div className="footer-contenido">
        <div className="footer-identidad">
          <h3 className="footer-nombre">Ronald Azuero</h3>
          <p className="footer-titulo">Desarrollador de Software & Estudiante de Ing. en TI</p>
          <p className="footer-universidad">Universidad Técnica de Machala, 6to Semestre</p>
        </div>
        <div className="footer-creditos-proyecto">
          <h4>Sobre este Proyecto</h4>
          <p>"Vi una necesidad propia y decidí compartir la solución con todos."</p>
          <p><strong>Tecnologías:</strong> React, Node.js, Express, CSS Grid/Flexbox.</p>
        </div>
        <div className="footer-contacto">
          <h4>Contacto</h4>
          <div className="footer-links">
            <a href="https://github.com/Sherman95" title="GitHub" target="_blank" rel="noopener noreferrer"><GitHubIcon /></a>
            <a href="mailto:sherman.2003.a@gmail.com" title="Email"><MailIcon /></a>
          </div>
        </div>
      </div>
      <div className="footer-copyright">
        <p>© {new Date().getFullYear()} - Ronald Azuero. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default Footer;