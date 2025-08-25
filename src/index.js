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
    const cancelNewUserBtn = document.getElementById('btn-cancel-new-user'); // Nuevo: Obtener el botón de cancelar

    const handleRegisterSubmit = async (event) => {
        event.preventDefault(); // Prevenir el envío por defecto del formulario

        // Obtener los valores del formulario
        const username = usernameInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Final frontend validation before sending
        if (password !== confirmPassword || password.length < 6 || username.length === 0) {
            formError.textContent = "Por favor, revisa los campos del formulario.";
            formError.style.display = 'block';
            return;
        }

        formError.textContent = "";
        formError.style.display = 'none';

        try {
            // Deshabilitar el botón y mostrar estado de carga
            createBtn.disabled = true;
            createBtn.innerHTML = 'Validando email...';
            createBtn.classList.add('opacity-50', 'cursor-not-allowed');

            // Transformar el nombre de usuario a email y validar existencia
            const email = await transformUsernameToEmail(username);

            // Actualizar estado de carga
            createBtn.innerHTML = 'Creando usuario...';

            // Llamar a la función de Supabase para crear el usuario
            const result = await createUser({
                email: email,
                password: password,
                username: username
            });
            
            if (result && result.success) {
                console.log("Usuario creado correctamente:", result.user);
                hideNewUserModal();
                showUserCreatedSuccessModal();
                registerForm.reset(); // Limpiar el formulario
            } else {
                 throw new Error(result.error || "Error desconocido al crear el usuario.");
            }

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
    
    // Nuevo: Event listener para el botón de cancelar
    if (cancelNewUserBtn) {
        cancelNewUserBtn.addEventListener('click', () => {
            hideNewUserModal();
        });
    }

    if (closeSuccessModalBtn) {
        closeSuccessModalBtn.addEventListener('click', hideUserCreatedSuccessModal);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
});