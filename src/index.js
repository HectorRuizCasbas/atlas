// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail, checkFormValidity } from './ui/validation.js';
import { createUser } from './api/supabase.js';

// Adjuntar event listeners.
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const createBtn = document.getElementById('btn-save-new-user');
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const formError = document.getElementById('form-error-message');
    const usernameInput = document.getElementById('new-user-username');
    const showNewUserModalBtn = document.getElementById('btn-show-new-user-modal');
    const closeNewUserModalBtn = document.getElementById('btn-close-new-user-modal');
    const closeSuccessModalBtn = document.getElementById('btn-close-success-modal');

    const handleRegisterSubmit = async (event) => {
        event.preventDefault(); // Prevenir el envío por defecto del formulario

        // Obtener los valores del formulario
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Limpiar el mensaje de error anterior
        formError.style.display = 'none';
        formError.textContent = '';
        
        // Deshabilitar el botón y mostrar un estado de carga
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="animate-spin inline-block mr-2">⚙️</span> Creando...';
        createBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            // Validar si las contraseñas coinciden y la longitud de la contraseña
            if (password !== confirmPassword) {
                throw new Error("Las contraseñas no coinciden.");
            }
            if (password.length < 6) {
                throw new Error("La contraseña debe tener al menos 6 caracteres.");
            }

            // Transformar el nombre de usuario en un correo de @zelenza.com
            const email = transformUsernameToEmail(username);

            // Preparar los datos para la llamada a la API
            const userData = { email, password, username };

            // Llamar a la función de creación de usuario en Supabase
            await createUser(userData);

            // Si la creación fue exitosa
            showUserCreatedSuccessModal();
        } catch (error) {
            console.error("Error en la creación del usuario:", error);
            formError.textContent = error.message || "Ha ocurrido un error inesperado.";
            formError.style.display = 'block';
        } finally {
            // Habilitar el botón de nuevo al finalizar
            createBtn.disabled = false;
            createBtn.innerHTML = 'Crear nuevo usuario';
            createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            checkFormValidity();
        }
    };

    if (passwordInput && confirmPasswordInput && usernameInput) {
        passwordInput.addEventListener('input', () => {
            validatePasswordLength();
            validatePasswordMatch();
            checkFormValidity();
        });
        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordMatch();
            checkFormValidity();
        });
        usernameInput.addEventListener('input', checkFormValidity);
    }
    
    if (showNewUserModalBtn) {
        showNewUserModalBtn.addEventListener('click', () => {
            showNewUserModal();
            checkFormValidity();
        });
    }

    if (closeNewUserModalBtn) {
        closeNewUserModalBtn.addEventListener('click', hideNewUserModal);
    }
    if (closeSuccessModalBtn) {
        closeSuccessModalBtn.addEventListener('click', hideUserCreatedSuccessModal);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
});