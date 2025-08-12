import React from 'react';

const variants = {
  error: 'alert alert-error',
  info: 'alert alert-info',
  success: 'alert alert-success'
};

function Alert({ type = 'info', message }) {
  if (!message) return null;
  return (
    <div className={variants[type] || variants.info} role="alert">
      {message}
    </div>
  );
}

export default Alert;
