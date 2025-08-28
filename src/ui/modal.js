// src/ui/modal.js

// Referencias a los elementos del DOM.
const newUserModal = document.getElementById('new-user-modal');
const userCreatedSuccessModal = document.getElementById('user-created-success-modal');

/**
 * Muestra el modal para crear un nuevo usuario.
 */
export const showNewUserModal = () => {
    newUserModal.classList.remove('hidden');
    newUserModal.classList.add('flex');
};

/**
 * Oculta el modal de nuevo usuario y limpia los campos.
 */
export const hideNewUserModal = () => {
    // Limpiar los campos del formulario.
    document.getElementById('new-user-username').value = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('new-user-confirm-password').value = '';
    
    // Limpiar mensajes de error
    const formError = document.getElementById('form-error-message');
    if (formError) {
        formError.textContent = '';
        formError.style.display = 'none';
    }

    // Ocultar el modal de nuevo usuario.
    newUserModal.classList.add('hidden');
    newUserModal.classList.remove('flex');
};

/**
 * Muestra el modal de éxito de creación de usuario.
 */
export const showUserCreatedSuccessModal = () => {
    // Ocultar el modal de registro si está visible.
    hideNewUserModal();
    // Mostrar el modal de éxito.
    userCreatedSuccessModal.classList.remove('hidden');
    userCreatedSuccessModal.classList.add('flex');
};

/**
 * Oculta el modal de éxito.
 */
export const hideUserCreatedSuccessModal = () => {
    userCreatedSuccessModal.classList.add('hidden');
    userCreatedSuccessModal.classList.remove('flex');
};

/**
 * Oculta el modal de edición de departamento.
 */
export const hideEditDepartmentModal = () => {
    const modal = document.getElementById('edit-department-modal');
    if (modal) {
	saveDepartmentChanges();
        // Solución robusta: establece el estilo en línea para asegurar que se oculte
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        console.log('El modal de edición de departamento ha sido ocultado.');
    } else {
        console.error('Elemento del modal de edición de departamento no encontrado.');
    }
};