// src/ui/modal.js

// Referencias a los elementos del DOM. Se asume que los modales tienen los IDs correspondientes.
const registerModal = document.getElementById('registerModal');
const successModal = document.getElementById('successModal');
const closeRegisterModalBtn = document.getElementById('closeRegisterModalBtn');
const showRegisterModalBtn = document.getElementById('showRegisterModalBtn');

/**
 * Muestra el modal de registro de usuario.
 */
export const showRegisterModal = () => {
    // Usar la API de Bootstrap para mostrar el modal.
    // Se asume que la librería Bootstrap ha sido cargada.
    $(registerModal).modal('show');
};

/**
 * Oculta el modal de registro y limpia los campos.
 */
export const hideRegisterModal = () => {
    // Limpiar los campos del formulario.
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Ocultar el modal de registro.
    $(registerModal).modal('hide');
};

/**
 * Muestra el modal de éxito.
 */
export const showSuccessModal = () => {
    // Ocultar el modal de registro si está visible.
    $(registerModal).modal('hide');
    // Mostrar el modal de éxito.
    $(successModal).modal('show');
};

/**
 * Oculta el modal de éxito.
 */
export const hideSuccessModal = () => {
    $(successModal).modal('hide');
};

// Adjuntar los event listeners a los botones.
showRegisterModalBtn.addEventListener('click', showRegisterModal);
closeRegisterModalBtn.addEventListener('click', hideRegisterModal);