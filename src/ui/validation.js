// src/ui/validation.js

const ZELENZA_DOMAIN = '@zelenza.com';

/**
 * Habilita o deshabilita el botón de guardar usuario en función de la validez del formulario.
 */
const checkFormValidity = () => {
    // Obtenemos todos los elementos necesarios.
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const usernameInput = document.getElementById('new-user-username');
    const saveButton = document.getElementById('btn-save-new-user');

    // Si alguno de los elementos no existe, salimos de la función.
    if (!passwordInput || !confirmPasswordInput || !usernameInput || !saveButton) {
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const username = usernameInput.value;

    // Verificamos todas las condiciones.
    const isPasswordValid = password.length >= 6;
    const isPasswordConfirmed = password === confirmPassword && confirmPassword.length > 0;
    const isUsernameValid = username.length > 0;

    // Si todas las condiciones se cumplen, habilitamos el botón.
    if (isPasswordValid && isPasswordConfirmed && isUsernameValid) {
        saveButton.disabled = false;
        saveButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        // En caso contrario, lo deshabilitamos.
        saveButton.disabled = true;
        saveButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
};

/**
 * Valida la longitud de la contraseña y actualiza el mensaje visual.
 */
const validatePasswordLength = () => {
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
const validatePasswordMatch = () => {
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
 * Configura todos los event listeners del formulario de nuevo usuario.
 * Esta función debe ser llamada cuando el modal esté disponible en el DOM.
 */
const setupEventListeners = () => {
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const usernameInput = document.getElementById('new-user-username');

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            validatePasswordLength();
            validatePasswordMatch();
            checkFormValidity();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordMatch();
            checkFormValidity();
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            checkFormValidity();
        });
    }
};

// Se recomienda llamar a esta función cuando la página se cargue.
// Si el modal se carga dinámicamente, deberás llamar a setupEventListeners()
// justo después de que el modal sea agregado al DOM.
document.addEventListener('DOMContentLoaded', setupEventListeners);