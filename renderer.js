import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// --- Supabase Client Configuration ---
// ¡Importante! Usa tu URL y la Service Role Key para operaciones de administrador.
// Guarda esta clave de forma segura y nunca la expongas en el cliente en producción.
// Para este ejemplo de desarrollo, la incluimos aquí, pero es una MALA PRÁCTICA en producción.
const supabaseUrl = 'https://bcsirtdbxzgtvqlagqpq.supabase.co'; // Reemplaza con la URL de tu proyecto
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjc2lydGRieHpndHZxbGFncXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUxNDUxNSwiZXhwIjoyMDcxMDkwNTE1fQ.59MNBb08v4R-WFEwhnJvv8TXRsIZS2HCS3DwHD2Auzw'; // Reemplaza con tu Service Role Key

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        persistSession: false
    }
});

// --- Helper functions for UI management ---
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
    closeUserInfoModal: document.getElementById('btn-close-user-info-modal'),
    saveNewUser: document.getElementById('btn-save-new-user')
};

const hamburgerMenus = {
    main: document.getElementById('hamburger-dropdown'),
    userManagement: document.getElementById('hamburger-dropdown-user-management')
};

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

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden', 'opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// --- Main function to register a new user ---
/**
 * Registers a new user in Supabase.
 * @param {string} username - The user's chosen username.
 * @param {string} password - The user's password.
 * @returns {Promise<{user: object, message: string}>} - An object with the created user and a success message.
 * @throws {Error} - Throws an error if validation or creation fails.
 */
async function registerUser(username, password) {
    // 1. Validate inputs
    if (!username || username.trim() === '') {
        throw new Error('El nombre de usuario no puede estar vacío.');
    }
    if (!password || password.trim() === '') {
        throw new Error('La contraseña no puede estar vacía.');
    }

    const email = `${username}@zelenza.com`;

    try {
        // 2. Check if the user already exists in auth.users
        const { data: usersData, error: usersError } = await supabase.from('profiles')
            .select('email')
            .eq('email', email)
            .limit(1);

        if (usersError) {
            throw new Error('Error al verificar la existencia del usuario.');
        }

        if (usersData && usersData.length > 0) {
            throw new Error('El nombre de usuario ya existe. Por favor, elige otro.');
        }

        // 3. Create user in auth.users
        const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Automatic email confirmation
        });

        if (authError) {
            throw new Error(`Error al crear el usuario en Auth: ${authError.message}`);
        }

        // 4. Create simultaneous record in profiles table
        const { data: profileData, error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            username: username,
            role: 'Usuario',
            supervisedUsers: [],
            lastActivity: new Date().toISOString(),
            email: email,
        });

        if (profileError) {
            // If profile creation fails, delete user from auth.users to avoid inconsistencies
            await supabase.auth.admin.deleteUser(user.id);
            throw new Error(`Error al crear el perfil: ${profileError.message}`);
        }

        // 5. Return success object
        return {
            user: user,
            message: `El usuario "${username}" ha sido creado con éxito.`
        };

    } catch (error) {
        console.error('Error en registerUser:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // --- UI Event Listeners ---

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

    // New User Modal Buttons
    buttons.saveNewUser.addEventListener('click', async () => {
        const usernameInput = document.getElementById('new-user-username');
        const passwordInput = document.getElementById('new-user-password');
        const confirmPasswordInput = document.getElementById('new-user-confirm-password');
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            showToast('Las contraseñas no coinciden.');
            return;
        }

        try {
            await registerUser(username, password);
            hideModal('newUser');
            showModal('userCreatedSuccess');
            usernameInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            // Reset the state of the save button
            buttons.saveNewUser.classList.add('btn-disabled');

        } catch (error) {
            showToast(error.message);
        }
    });

    // Logic to enable/disable the "Create User" button
    const usernameInput = document.getElementById('new-user-username');
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');

    const checkFormValidity = () => {
        const usernameValid = usernameInput.value.trim().length > 0;
        const passwordValid = passwordInput.value.length >= 3;
        const passwordsMatch = passwordInput.value === confirmPasswordInput.value;
        if (usernameValid && passwordValid && passwordsMatch) {
            buttons.saveNewUser.classList.remove('btn-disabled');
        } else {
            buttons.saveNewUser.classList.add('btn-disabled');
        }
    };
    
    usernameInput.addEventListener('input', checkFormValidity);
    passwordInput.addEventListener('input', checkFormValidity);
    confirmPasswordInput.addEventListener('input', checkFormValidity);

    // 2. Main Screen
    buttons.hamburger.addEventListener('click', (event) => {
        event.stopPropagation();
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
    buttons.closeNewUserModal.addEventListener('click', () => {
        hideModal('newUser');
        // Reset inputs on close
        document.getElementById('new-user-username').value = '';
        document.getElementById('new-user-password').value = '';
        document.getElementById('new-user-confirm-password').value = '';
        buttons.saveNewUser.classList.add('btn-disabled'); // Disable button
    });
    buttons.closeUserCreatedSuccess.addEventListener('click', () => hideModal('userCreatedSuccess'));
    buttons.closeChangePassword.addEventListener('click', () => hideModal('changePassword'));
    buttons.closeEditUserModal.addEventListener('click', () => hideModal('editUser'));
    buttons.closeUserInfoModal.addEventListener('click', () => hideModal('userInfo'));

    // 5. Example of a button that would open a modal (e.g., a task card)
    const exampleTaskCard = document.createElement('div');
    exampleTaskCard.innerHTML = `<div class="bg-slate-800 p-4 rounded-xl shadow-lg cursor-pointer">
        <h3 class="text-lg font-semibold text-indigo-400">Tarea de Ejemplo</h3>
        <p class="text-sm text-slate-400">Ejemplo de descripción de tarea.</p>
    </div>`;
    exampleTaskCard.addEventListener('click', () => {
        showModal('task');
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