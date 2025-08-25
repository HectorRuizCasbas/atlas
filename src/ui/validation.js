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
 * Valida si un email existe (simulación - en producción necesitarías un servicio real)
 * @param {string} email - El email a validar
 * @returns {Promise<boolean>} - True si el email existe
 */
export const validateEmailExists = async (email) => {
    // NOTA: Esta es una simulación. En producción necesitarías:
    // 1. Un servicio de validación de emails como Hunter.io, ZeroBounce, etc.
    // 2. O una API interna que consulte tu directorio de empleados
    
    // Por ahora, simulamos que algunos emails existen
    const validEmails = [
        'admin@zelenza.com',
        'hector@zelenza.com',
        'agustin@zelenza.com',
        'test@zelenza.com',
        'usuario@zelenza.com'
    ];
    
    // Simular delay de red más corto para testing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`Validando email: ${email}`);
    const exists = validEmails.includes(email.toLowerCase());
    console.log(`Email ${email} existe: ${exists}`);
    
    return exists;
};

/**
 * Transforma un nombre de usuario en un correo electrónico de la empresa y valida su existencia.
 */
export const transformUsernameToEmail = async (username) => {
    let email;
    
    if (username.includes('@')) {
        // Usuario escribió email completo
        if (!username.endsWith(ZELENZA_DOMAIN)) {
            throw new Error(`Solo se permiten usuarios del dominio ${ZELENZA_DOMAIN}`);
        }
        email = username;
    } else {
        // Usuario escribió solo el nombre
        email = `${username}${ZELENZA_DOMAIN}`;
    }
    
    // Validar que el email existe
    const emailExists = await validateEmailExists(email);
    if (!emailExists) {
        throw new Error(`El email ${email} no existe en el sistema. Contacta con el administrador.`);
    }
    
    return email;
};