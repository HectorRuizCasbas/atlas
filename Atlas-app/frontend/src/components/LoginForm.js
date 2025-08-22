# Crear el componente LoginForm.js en React
login_form_code = '''
import React from 'react';
import icono from '....icono.jpg';
import '.LoginForm.css';

function LoginForm() {
  return (
    div className=login-container
      img src={icono} alt=Atlas Logo className=login-logo 
      h1Atlas - Tu mundo bajo controlh1
      h2Iniciar Sesiónh2
      form className=login-form
        label htmlFor=usuarioUsuariolabel
        input type=text id=usuario name=usuario 

        label htmlFor=contrasenaContraseñalabel
        input type=password id=contrasena name=contrasena 

        button type=submitIniciar Sesiónbutton
        button type=buttonNuevo usuariobutton
      form
    div
  );
}

export default LoginForm;
'''

# Crear el archivo LoginForm.js
path = atlas-appfrontendsrccomponentsLoginForm.js
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, w, encoding=utf-8) as f
    f.write(login_form_code)

print(✅ Componente LoginForm.js creado correctamente en React.)
