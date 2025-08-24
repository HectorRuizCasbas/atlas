// src/ui/validation.js

const ZELENZA_DOMAIN = '@zelenza.com';

/**
 * Valida la longitud de la contraseña y actualiza el mensaje visual.
 */
export const validatePasswordLength = () => {
    // Usamos los IDs correctos del HTML
    const passwordInput = document.getElementById('new-user-password');
    const passwordLengthMessage = document.getElementById('new-user-password-help'); 

    // Verificamos si los elementos existen
    if (!passwordInput || !passwordLengthMessage) return;

    const password = passwordInput.value;
    const length = password.length;

    if (length === 0) {
        // Mensaje por defecto cuando el campo está vacío
        passwordLengthMessage.textContent = "La contraseña debe tener al menos 6 caracteres";
        passwordLengthMessage.style.color = 'gray'; 
    } else {
        // Mensaje de longitud si no está vacío
        passwordLengthMessage.textContent = `La longitud de su contraseña es de ${length}/6.`;

        if (length < 6) {
            passwordLengthMessage.style.color = 'red';
        } else {
            passwordLengthMessage.style.color = 'green';
        }
    }
};

/**
 * Valida que los campos de contraseña y confirmar contraseña coincidan.
 */
export const validatePasswordMatch = () => {
    // Usamos los IDs correctos del HTML
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const confirmPasswordMessage = document.getElementById('new-user-confirm-password-help');

    // Verificamos si los elementos existen
    if (!passwordInput || !confirmPasswordInput || !confirmPasswordMessage) return;

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword.length === 0) {
        // Mensaje por defecto cuando el campo está vacío
        confirmPasswordMessage.textContent = "Las contraseñas deben coincidir";
        confirmPasswordMessage.style.color = 'gray';
    } else if (password === confirmPassword) {
        confirmPasswordMessage.textContent = "Las contraseñas coinciden";
        confirmPasswordMessage.style.color = 'green';
    } else {
        confirmPasswordMessage.textContent = "Las contraseñas no coinciden";
        confirmPasswordMessage.style.color = 'red';
    }
};

/**
 * Transforma un nombre de usuario en un correo electrónico de la empresa.
 * @param {string} username El nombre de usuario ingresado.
 * @returns {string} El correo electrónico transformado.
 */
export const transformUsernameToEmail = (username) => {
    // Comprobar si el nombre de usuario ya es un correo.
    if (username.includes('@')) {
        // Si el dominio no es @zelenza.com, lanzar un error.
        if (!username.endsWith(ZELENZA_DOMAIN)) {
            throw new Error(`Solo se permiten usuarios del dominio ${ZELENZA_DOMAIN}`);
        }
        return username; // Devolver el correo original si ya lo es.
    }
    // Si no es un correo, añadir el dominio.
    return `${username}${ZELENZA_DOMAIN}`;
};