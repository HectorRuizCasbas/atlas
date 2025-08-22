document.addEventListener('DOMContentLoaded', () => {

    // --- Screen and Modal Elements ---
    const screens = {
        login: document.getElementById('screen-login'),
        main: document.getElementById('screen-main'),
        userManagement: document.getElementById('screen-user-management')
    };

    const modals = {
        task: document.getElementById('modal'),
        deleteConfirm: document.getElementById('delete-confirm-modal'),
        changePassword: document.getElementById('change-password-modal'),
        newUser: document.getElementById('new-user-modal'),
        userCreatedSuccess: document.getElementById('user-created-success-modal'),
        editUser: document.getElementById('edit-user-modal'),
        userInfo: document.getElementById('user-info-modal'),
        help: document.getElementById('help-modal')
    };
    
    // --- Buttons ---
    const buttons = {
        login: document.getElementById('btn-login'),
        newUserLink: document.getElementById('new-user-link'),
        hamburger: document.getElementById('hamburger-button'),
        hamburgerUserManagement: document.getElementById('hamburger-button-user-management'),
        logout: document.getElementById('btn-logout'),
        logoutUserManagement: document.getElementById('btn-logout-user-management'),
        userManagement: document.getElementById('btn-user-management'),
        backToMain: document.getElementById('btn-back-to-main-from-user-list'),
        help: document.getElementById('btn-help'),
        helpUserManagement: document.getElementById('btn-help-user-management'),
        changePassword: document.getElementById('btn-change-password'),
        changePasswordUserManagement: document.getElementById('btn-change-password-user-management'),
        deleteOwnAccount: document.getElementById('btn-delete-own-account'),
        deleteOwnAccountUserManagement: document.getElementById('btn-delete-own-account-user-management'),
        closeModal: document.getElementById('close-modal'),
        closeHelpModal: document.getElementById('btn-close-help-modal'),
        closeDeleteConfirm: document.getElementById('btn-delete-cancel'),
        closeNewUserModal: document.getElementById('btn-cancel-new-user'),
        closeUserCreatedSuccess: document.getElementById('btn-close-success-modal'),
        closeChangePassword: document.getElementById('btn-cancel-change-password'),
        closeEditUserModal: document.getElementById('btn-cancel-edit-user'),
        closeUserInfoModal: document.getElementById('btn-close-user-info-modal')
    };

    const hamburgerMenus = {
        main: document.getElementById('hamburger-dropdown'),
        userManagement: document.getElementById('hamburger-dropdown-user-management')
    };
    
    // --- Helper functions to manage screen and modal visibility ---
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        screens[screenId].classList.remove('hidden');
    }

    function showModal(modalId) {
        modals[modalId].classList.remove('hidden');
        modals[modalId].classList.add('flex');
    }

    function hideModal(modalId) {
        modals[modalId].classList.add('hidden');
        modals[modalId].classList.remove('flex');
    }
    
    function toggleHamburgerMenu(menuId) {
        Object.values(hamburgerMenus).forEach(menu => {
            if (menu.id === menuId) {
                menu.classList.toggle('show');
            } else {
                menu.classList.remove('show');
            }
        });
    }
    
    // --- Event Listeners for UI interaction ---

    // 1. Login Screen
    buttons.login.addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        if (username) {
            document.getElementById('current-user').textContent = username;
            document.getElementById('current-user-user-management').textContent = username;
            showScreen('main');
        } else {
            const errorMessage = document.getElementById('login-error-message');
            errorMessage.textContent = 'Por favor, introduce un nombre de usuario.';
            errorMessage.classList.remove('hidden');
        }
    });

    buttons.newUserLink.addEventListener('click', () => {
        showModal('newUser');
    });

    // 2. Main Screen
    buttons.hamburger.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevents the body listener from immediately closing the menu
        toggleHamburgerMenu('hamburger-dropdown');
    });

    buttons.userManagement.addEventListener('click', () => {
        showScreen('userManagement');
        toggleHamburgerMenu('hamburger-dropdown');
    });

    buttons.changePassword.addEventListener('click', () => {
        showModal('changePassword');
        toggleHamburgerMenu('hamburger-dropdown');
    });

    buttons.deleteOwnAccount.addEventListener('click', () => {
        showModal('deleteConfirm');
        document.getElementById('delete-confirm-modal-title').textContent = 'Confirmar Eliminación de Cuenta';
        document.getElementById('delete-confirm-modal-message').textContent = '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.';
        document.getElementById('delete-confirm-text-input').classList.remove('hidden');
        document.getElementById('delete-confirm-modal-info').classList.add('hidden');
        toggleHamburgerMenu('hamburger-dropdown');
    });

    buttons.help.addEventListener('click', () => {
        showModal('help');
        // Placeholder help content
        document.getElementById('help-content').innerHTML = `
            <div class="help-section">
                <h3>Creación y Gestión de Tareas</h3>
                <p>Usa la sección "Crear Nueva Tarea" para añadir una tarea con su título, prioridad, descripción, y usuario asignado. Marca la casilla "Tarea privada" para que solo sea visible para el creador.</p>
                <div class="help-feature">
                    <strong>Guardar Cambios:</strong> Para guardar los cambios de una tarea, usa el botón "Guardar cambios" dentro del modal de la tarea.
                </div>
            </div>
            <div class="help-section">
                <h3>Filtrado de Tareas</h3>
                <p>Utiliza la sección "Filtrar Tareas" para buscar tareas por título, estado o prioridad. Haz clic en "Resetear Filtros" para volver a la lista completa.</p>
            </div>
            <div class="help-section">
                <h3>Comentarios en Tareas</h3>
                <p>Puedes comunicarte con otros usuarios dentro del modal de cada tarea. Los mensajes se envían y reciben en tiempo real para facilitar la colaboración.</p>
            </div>
        `;
        toggleHamburgerMenu('hamburger-dropdown');
    });

    buttons.logout.addEventListener('click', () => {
        showScreen('login');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error-message').classList.add('hidden');
        toggleHamburgerMenu('hamburger-dropdown');
    });

    // 3. User Management Screen
    buttons.hamburgerUserManagement.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleHamburgerMenu('hamburger-dropdown-user-management');
    });

    buttons.backToMain.addEventListener('click', () => {
        showScreen('main');
        toggleHamburgerMenu('hamburger-dropdown-user-management');
    });

    buttons.changePasswordUserManagement.addEventListener('click', () => {
        showModal('changePassword');
        toggleHamburgerMenu('hamburger-dropdown-user-management');
    });

    buttons.deleteOwnAccountUserManagement.addEventListener('click', () => {
        showModal('deleteConfirm');
        document.getElementById('delete-confirm-modal-title').textContent = 'Confirmar Eliminación de Cuenta';
        document.getElementById('delete-confirm-modal-message').textContent = '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.';
        document.getElementById('delete-confirm-text-input').classList.remove('hidden');
        document.getElementById('delete-confirm-modal-info').classList.add('hidden');
        toggleHamburgerMenu('hamburger-dropdown-user-management');
    });
    
    buttons.helpUserManagement.addEventListener('click', () => {
        showModal('help');
        document.getElementById('help-content').innerHTML = `
            <div class="help-section">
                <h3>Configuración de Usuarios</h3>
                <p>Desde esta pantalla, los administradores pueden añadir, editar y eliminar usuarios. También puedes gestionar la visibilidad de tareas entre usuarios.</p>
            </div>
            <div class="help-section">
                <h3>Añadir y Editar Usuarios</h3>
                <p>Usa el formulario superior para añadir un nuevo usuario. Para editar un usuario existente, haz clic en el icono de lápiz en la tabla de "Lista de Usuarios".</p>
                <div class="help-feature">
                    <strong>Visibilidad:</strong> En la ventana de edición de usuario, puedes configurar quién puede ver las tareas de este usuario.
                </div>
            </div>
            <div class="help-section">
                <h3>Eliminar Usuarios</h3>
                <p>Solo puedes eliminar usuarios que estén desconectados. Si el usuario está en línea, la opción de eliminar estará desactivada.</p>
            </div>
        `;
        toggleHamburgerMenu('hamburger-dropdown-user-management');
    });
    
    buttons.logoutUserManagement.addEventListener('click', () => {
        showScreen('login');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error-message').classList.add('hidden');
        toggleHamburgerMenu('hamburger-dropdown-user-management');
    });

    // 4. Modal Closers
    buttons.closeModal.addEventListener('click', () => hideModal('task'));
    buttons.closeHelpModal.addEventListener('click', () => hideModal('help'));
    buttons.closeDeleteConfirm.addEventListener('click', () => hideModal('deleteConfirm'));
    buttons.closeNewUserModal.addEventListener('click', () => hideModal('newUser'));
    buttons.closeUserCreatedSuccess.addEventListener('click', () => hideModal('userCreatedSuccess'));
    buttons.closeChangePassword.addEventListener('click', () => hideModal('changePassword'));
    buttons.closeEditUserModal.addEventListener('click', () => hideModal('editUser'));
    buttons.closeUserInfoModal.addEventListener('click', () => hideModal('userInfo'));
    
    // 5. Example of a button that would open a modal (e.g., a task card)
    // This is just a placeholder to show how it would work
    const exampleTaskCard = document.createElement('div');
    exampleTaskCard.innerHTML = `<div class="bg-slate-800 p-4 rounded-xl shadow-lg cursor-pointer">
        <h3 class="text-lg font-semibold text-indigo-400">Tarea de Ejemplo</h3>
        <p class="text-sm text-slate-400">Ejemplo de descripción de tarea.</p>
    </div>`;
    exampleTaskCard.addEventListener('click', () => {
        showModal('task');
        // Populate modal with example data
        document.getElementById('modal-title').textContent = 'Tarea de Ejemplo';
        document.getElementById('edit-title').value = 'Tarea de Ejemplo';
        document.getElementById('edit-desc').value = 'Ejemplo de descripción de tarea.';
    });
    document.getElementById('tasks-grid').appendChild(exampleTaskCard);
    
    // 6. Modal Openers (for user management)
    const exampleUser = document.createElement('tr');
    exampleUser.innerHTML = `<td class="py-3 px-4">usuario_ejemplo</td>
                             <td class="py-3 px-4">Usuario</td>
                             <td class="py-3 px-4">2 Usuarios</td>
                             <td class="py-3 px-4">
                                 <button class="text-blue-400 hover:text-blue-500 mr-2 btn-edit-user">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                         <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                     </svg>
                                 </button>
                                 <button class="text-rose-400 hover:text-rose-500 btn-delete-user">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                         <path d="M3 6h18"></path>
                                         <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                     </svg>
                                 </button>
                             </td>`;

    exampleUser.querySelector('.btn-edit-user').addEventListener('click', () => {
        showModal('editUser');
    });

    exampleUser.querySelector('.btn-delete-user').addEventListener('click', () => {
        showModal('deleteConfirm');
        document.getElementById('delete-confirm-modal-title').textContent = 'Confirmar Eliminación de Usuario';
        document.getElementById('delete-confirm-modal-message').textContent = '¿Estás seguro de que quieres eliminar al usuario "usuario_ejemplo"?';
        document.getElementById('delete-confirm-text-input').classList.add('hidden');
        document.getElementById('delete-confirm-modal-info').classList.remove('hidden');
    });

    document.getElementById('users-table-body').appendChild(exampleUser);
    
});