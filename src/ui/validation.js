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

    // Mensajes de depuración para ver el estado de cada validación.
    console.log('--- Estado de Validación ---');
    console.log('Usuario válido:', isUsernameValid, ' (Valor:', username, ')');
    console.log('Contraseña válida:', isPasswordValid, ' (Longitud:', password.length, ')');
    console.log('Contraseñas coinciden:', isPasswordConfirmed, ' (Password:', password, '| Confirm:', confirmPassword, ')');
    console.log('Formulario válido en total:', isFormValid);
    console.log('---------------------------');

    if (isFormValid) {
        saveButton.disabled = false;
        saveButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        saveButton.disabled = true;
        saveButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
};

/**
 * Valida la longitud de la contraseña y actualiza el mensaje visual.
 */
export const validatePasswordLength = () => {
    const passwordInput = document.getElementById('new-user-password');
    const passwordLengthMessage = document.getElementById('new-user-password-help'); 
    if (!passwordInput || !passwordLengthMessage) return;
    const password = passwordInput.value;
    const length = password.length;
    if (length === 0) {
        passwordLengthMessage.textContent = "La contraseña debe tener al menos 6 caracteres";
        passwordLengthMessage.style.color = 'gray'; 
    } else {
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
 */
export const transformUsernameToEmail = (username) => {
    if (username.includes('@')) {
        if (!username.endsWith(ZELENZA_DOMAIN)) {
            throw new Error(`Solo se permiten usuarios del dominio ${ZELENZA_DOMAIN}`);
        }
        return username;
    }
    return `${username}${ZELENZA_DOMAIN}`;
};