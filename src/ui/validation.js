// src/ui/validation.js

const passwordLengthMessage = document.getElementById('password-length-message');
const confirmPasswordMessage = document.getElementById('confirm-password-message');

const ZELENZA_DOMAIN = '@zelenza.com';

/**
 * Valida la longitud de la contraseña y actualiza el mensaje visual.
 */
export const validatePasswordLength = () => {
    // Obtener la referencia al elemento dentro de la función
    const passwordInput = document.getElementById('password'); 
    
    // Verificar si el elemento existe antes de acceder a su valor
    if (!passwordInput) return;

    const password = passwordInput.value;
    const length = password.length;
    passwordLengthMessage.textContent = `La longitud de su contraseña es de ${length}/6.`;

    if (length === 0) {
        passwordLengthMessage.textContent = "La contraseña debe contener al menos 6 caracteres";
        passwordLengthMessage.style.color = 'gray';
    } else if (length < 6) {
        passwordLengthMessage.style.color = 'red';
    } else {
        passwordLengthMessage.style.color = 'green';
    }
};

/**
 * Valida que los campos de contraseña y confirmar contraseña coincidan.
 */
export const validatePasswordMatch = () => {
    // Obtener la referencia a los elementos dentro de la función
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Verificar si los elementos existen antes de acceder a sus valores
    if (!passwordInput || !confirmPasswordInput) return;

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword.length === 0) {
        confirmPasswordMessage.textContent = "Las contraseñas deben coincidir exactamente";
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