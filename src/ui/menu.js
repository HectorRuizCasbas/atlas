// src/ui/menu.js
import { getCurrentUserProfile } from '../api/supabase.js';

// Función para inicializar la sesión del usuario y la interfaz de usuario.
export const initializeUserSession = async (currentPageId) => {
    try {
        const profile = await getCurrentUserProfile();
        if (!profile) {
            console.warn('Perfil de usuario no encontrado. La sesión no se pudo inicializar.');
            return;
        }

        // Actualizar elementos de la interfaz con información del usuario.
        const currentUserElements = document.querySelectorAll(
            '#current-user, #current-user-user-management, #current-user-department-management'
        );
        currentUserElements.forEach(element => {
            if (element) {
                element.textContent = profile.full_name || profile.username;
            }
        });

        // Configurar permisos del menú según el rol.
        setupMenuPermissions(profile.role, currentPageId);

        // Adjuntar event listeners a todos los menús hamburguesa.
        setupAllHamburgerMenus();

        // Actualizar la última actividad del usuario.
        // await updateLastActivity();
        
        console.log('Sesión inicializada para:', profile);

    } catch (error) {
        console.error('Error inicializando sesión:', error);
    }
};

// Función para configurar permisos y el estado del menú
async function setupMenuPermissions(userRole, currentPageId) {
    const departmentsBtn = document.getElementById('btn-navigate-departments');
    const usersBtn = document.getElementById('btn-navigate-users');
    const tasksBtn = document.getElementById('btn-navigate-tasks');

    // Mapear los IDs de las pantallas a los IDs de los botones del menú.
    const pageToButtonMap = {
        'screen-main': tasksBtn,
        'screen-user-management': usersBtn,
        'screen-department-management': departmentsBtn
    };

    // Deshabilitar el botón de la página actual.
    for (const buttonId in pageToButtonMap) {
        const button = pageToButtonMap[buttonId];
        if (button) {
            if (buttonId === currentPageId) {
                button.classList.add('text-gray-500', 'cursor-not-allowed');
                button.disabled = true;
            } else {
                button.classList.remove('text-gray-500', 'cursor-not-allowed');
                button.disabled = false;
            }
        }
    }

    // Configurar visibilidad según el rol.
    if (userRole === 'Administrador') {
        if (departmentsBtn) departmentsBtn.classList.remove('hidden');
        if (usersBtn) usersBtn.classList.remove('hidden');
    } else if (userRole === 'Responsable') {
        if (departmentsBtn) departmentsBtn.classList.remove('hidden');
        if (usersBtn) usersBtn.classList.add('hidden');
    } else {
        if (departmentsBtn) departmentsBtn.classList.add('hidden');
        if (usersBtn) usersBtn.classList.add('hidden');
    }
}

// Función para adjuntar event listeners a todos los menús hamburguesa.
function setupAllHamburgerMenus() {
    const hamburgerButtons = document.querySelectorAll('.hamburger-button');
    hamburgerButtons.forEach(button => {
        const oldClone = button.cloneNode(true);
        button.parentNode.replaceChild(oldClone, button);
    });

    const newHamburgerButtons = document.querySelectorAll('.hamburger-button');
    newHamburgerButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const dropdown = button.nextElementSibling;
            document.querySelectorAll('.hamburger-dropdown.show').forEach(openDropdown => {
                if (openDropdown !== dropdown) {
                    openDropdown.classList.remove('show');
                }
            });
            dropdown.classList.toggle('show');
        });
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.hamburger-menu')) {
            document.querySelectorAll('.hamburger-dropdown.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });
}