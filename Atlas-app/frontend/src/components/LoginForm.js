import React from 'react';
import icono from './icono.jpg'; // Asegúrate de que el archivo esté en la misma carpeta
import './LoginForm.css'; // Asegúrate de que el CSS esté en la misma carpeta

function LoginForm() {
  return (
    <div className="login-container">
      <img src={icono} alt="Atlas Logo" className="login-logo" />
      <h1>Atlas - Tu mundo bajo control</h1>
      <h2>Iniciar Sesión</h2>
      <form className="login-form">
        <label htmlFor="usuario">Usuario</label>
        <input type="text" id="usuario" name="usuario" />

        <label htmlFor="contrasena">Contraseña</label>
        <input type="password" id="contrasena" name="contrasena" />

        <button type="submit">Iniciar Sesión</button>
        <button type="button">Nuevo usuario</button>
      </form>
    </div>
  );
}

export default LoginForm;
