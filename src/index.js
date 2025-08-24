// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail } from './ui/validation.js';
import { createUser } from './api/supabase.js';

// Adjuntar event listeners.
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const createBtn = document.getElementById('btn-save-new-user');
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const formError = document.getElementById('form-error-message');
    const usernameInput = document.getElementById('new-user-username'); // NUEVO

    const showNewUserModalBtn = document.getElementById('btn-show-new-user-modal');
    const closeNewUserModalBtn = document.getElementById('btn-close-new-user-modal');
    const closeSuccessModalBtn = document.getElementById('btn-close-success-modal');

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {
            formError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }
        if (password !== confirmPassword) {
            formError.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        try {
            const email = transformUsernameToEmail(username);

            formError.textContent = '';
            createBtn.disabled = true;

            await createUser({ email, password, username });

            showUserCreatedSuccessModal();
            hideNewUserModal();
            
        } catch (error) {
            formError.textContent = error.message;
            console.error('Error al crear el usuario:', error);
        } finally {
            createBtn.disabled = false;
        }
    };
    
    // Adjuntar los event listeners para validación en tiempo real.
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
        usernameInput.addEventListener('input', checkFormValidity); // NUEVO
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    
    if (showNewUserModalBtn) {
        showNewUserModalBtn.addEventListener('click', () => {
            showNewUserModal();
            // Llamamos a la validación inicial cuando se abre el modal.
            checkFormValidity();
        });
    }
    if (closeNewUserModalBtn) {
        closeNewUserModalBtn.addEventListener('click', hideNewUserModal);
    }
    if (closeSuccessModalBtn) {
        closeSuccessModalBtn.addEventListener('click', hideUserCreatedSuccessModal);
    }
});