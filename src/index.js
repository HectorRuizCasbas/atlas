// src/index.js

// Importar todas las funciones de los módulos.
import { showRegisterModal, hideRegisterModal, showSuccessModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail } from './ui/validation.js';
import { createUser } from './api/supabase.js';

// Adjuntar event listeners.
document.addEventListener('DOMContentLoaded', () => {
    // Obtener las referencias a los elementos del DOM.
    // ESTAS LINEAS DEBEN ESTAR DENTRO DEL EVENTO DOMContentLoaded.
    const registerForm = document.getElementById('registerForm');
    const createBtn = document.getElementById('createBtn');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const formError = document.getElementById('form-error-message');
    
    // Referencias a los botones del modal.
    const showRegisterModalBtn = document.getElementById('showRegisterModalBtn');
    const closeRegisterModalBtn = document.getElementById('closeRegisterModalBtn');
    
    /**
     * Función principal para manejar el envío del formulario de registro.
     * @param {Event} event El evento de envío del formulario.
     */
    const handleRegisterSubmit = async (event) => {
        event.preventDefault();

        // Validar los campos antes de enviar.
        const username = document.getElementById('username').value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {
            formError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }
        if (password!== confirmPassword) {
            formError.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        try {
            // Transformar el usuario en un correo electrónico.
            const email = transformUsernameToEmail(username);

            // Limpiar mensajes de error.
            formError.textContent = '';

            // Deshabilitar el botón para evitar múltiples envíos.
            createBtn.disabled = true;

            // Llamar a la función de la API para crear el usuario.
            await createUser({ email, password, username });

            // Si la operación es exitosa, mostrar el modal de éxito.
            showSuccessModal();
            hideRegisterModal();
            
        } catch (error) {
            // Mostrar el mensaje de error de la API.
            formError.textContent = error.message;
            console.error('Error al crear el usuario:', error);
        } finally {
            // Habilitar el botón.
            createBtn.disabled = false;
        }
    };
    
    // Escuchar cambios en los campos de contraseña para validación en tiempo real.
    // Estos listeners ahora están en el lugar correcto.
    if (passwordInput && confirmPasswordInput) {
        passwordInput.addEventListener('input', validatePasswordLength);
        passwordInput.addEventListener('input', validatePasswordMatch);
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }
    
    // Escuchar el evento de envío del formulario.
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    
    // Adjuntar los event listeners para los botones del modal aquí.
    if (showRegisterModalBtn) {
        showRegisterModalBtn.addEventListener('click', showRegisterModal);
    }
    if (closeRegisterModalBtn) {
        closeRegisterModalBtn.addEventListener('click', hideRegisterModal);
    }
});