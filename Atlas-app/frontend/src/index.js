import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Importa App.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App /> {/* Renderiza el componente App */}
  </React.StrictMode>
);