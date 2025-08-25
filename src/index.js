// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail, checkFormValidity } from './ui/validation.js';
import { createUser } from './api/supabase.js';

// Adjuntar event listeners.
document.addEventListener('DOMContentLoaded', () => {
    const createBtn = document.getElementById('btn-save-new-user');
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const formError = document.getElementById('form-error-message');
    const usernameInput = document.getElementById('new-user-username');
    const showNewUserModalBtn = document.getElementById('btn-show-new-user-modal');
    const closeNewUserModalBtn = document.getElementById('btn-close-new-user-modal');
    const closeSuccessModalBtn = document.getElementById('btn-close-success-modal');
    const cancelNewUserBtn = document.getElementById('btn-cancel-new-user');

    const handleRegisterSubmit = async (event) => {
        event.preventDefault(); // Prevenir el envío por defecto del formulario
        
        console.log('Botón de crear usuario clickeado');

        // Obtener los valores del formulario
        const username = usernameInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        console.log('Datos del formulario:', { username, password: '***', confirmPassword: '***' });
        
        // Final frontend validation before sending
        if (password !== confirmPassword || password.length < 6 || username.length === 0) {
            console.log('Validación fallida');
            formError.textContent = "Por favor, revisa los campos del formulario.";
            formError.style.display = 'block';
            return;
        }

        console.log('Validación pasada, iniciando proceso...');
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
            createBtn.innerHTML = 'Crear Usuario';
            createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            checkFormValidity();
        }
    };

    // Event listeners para validación en tiempo real
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
    
    // Event listener para mostrar el modal
    if (showNewUserModalBtn) {
        showNewUserModalBtn.addEventListener('click', () => {
            showNewUserModal();
            checkFormValidity();
        });
    }

    // Event listener para cerrar el modal
    if (closeNewUserModalBtn) {
        closeNewUserModalBtn.addEventListener('click', hideNewUserModal);
    }
    
    // Event listener para el botón de cancelar
    if (cancelNewUserBtn) {
        cancelNewUserBtn.addEventListener('click', () => {
            hideNewUserModal();
        });
    }

    // Event listener para cerrar el modal de éxito
    if (closeSuccessModalBtn) {
        closeSuccessModalBtn.addEventListener('click', hideUserCreatedSuccessModal);
    }

    // IMPORTANTE: Event listener para el botón de crear usuario
    if (createBtn) {
        createBtn.addEventListener('click', handleRegisterSubmit);
    }
});