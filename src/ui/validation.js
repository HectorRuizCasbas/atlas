// src/ui/validation.js

const ZELENZA_DOMAIN = '@zelenza.com';

/**
 * Habilita o deshabilita el botón de guardar usuario en función de la validez del formulario.
 */
export const checkFormValidity = () => {
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const usernameInput = document.getElementById('new-user-username');
    const saveButton = document.getElementById('btn-save-new-user');

    if (!passwordInput || !confirmPasswordInput || !usernameInput || !saveButton) {
        console.warn('Advertencia: No se encontraron todos los elementos del formulario para la validación.');
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const username = usernameInput.value;

    const isPasswordValid = password.length >= 6;
    const isPasswordConfirmed = (password === confirmPassword) && (confirmPassword.length > 0);
    const isUsernameValid = username.length > 0;
    const isFormValid = isPasswordValid && isPasswordConfirmed && isUsernameValid;

    if (isFormValid) {
        saveButton.disabled = false;
        saveButton.classList.remove('opacity-50', 'cursor-not-allowed', 'btn-disabled');
    } else {
        saveButton.disabled = true;
        saveButton.classList.add('opacity-50', 'cursor-not-allowed', 'btn-disabled');
    }
};

/**
 * Valida que la contraseña tenga al menos 6 caracteres.
 */
export const validatePasswordLength = () => {
    const passwordInput = document.getElementById('new-user-password');
    const passwordMessage = document.getElementById('new-user-password-help');
    if (!passwordInput || !passwordMessage) return;
    if (passwordInput.value.length >= 6 || passwordInput.value.length === 0) {
        passwordMessage.style.display = 'none';
    } else {
        passwordMessage.textContent = "La contraseña debe tener al menos 6 caracteres";
        passwordMessage.style.display = 'block';
    }
};

/**
 * Valida que los campos de contraseña y confirmar contraseña coincidan.
 */
export const validatePasswordMatch = () => {
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const confirmPasswordMessage = document.getElementById('new-user-confirm-password-help');
    if (!passwordInput || !confirmPasswordInput || !confirmPasswordMessage) return;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (confirmPassword.length === 0) {
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
 * @param {string} username - El nombre de usuario a transformar.
 * @returns {string} El correo electrónico resultante.
 * @throws {Error} Si el usuario introduce un correo con un dominio diferente a @zelenza.com.
 */
export const transformUsernameToEmail = (username) => {
    // Si el nombre de usuario ya contiene un '@', se asume que es un correo completo.
    if (username.includes('@')) {
        // Verificar que el dominio sea el correcto.
        if (!username.endsWith(ZELENZA_DOMAIN)) {
            throw new Error(`Solo se permiten usuarios del dominio ${ZELENZA_DOMAIN}.`);
        }
        return username;
    }
    // Si no contiene '@', se añade el dominio de Zelenza.
    return `${username}${ZELENZA_DOMAIN}`;
};