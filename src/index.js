// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal, hideEditDepartmentModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail, checkFormValidity, validateLoginFields } from './ui/validation.js';
import { createUser, loginUser, getCurrentUserProfile, updateLastActivity, getDepartments, logoutUser, hasActiveSession } from './api/supabase.js';
import { initializeTaskManagement } from './ui/tasks.js';
import { initializeUserManagement, showUserManagementScreen } from './ui/user-management.js';
import { initializeDepartmentManagement, showDepartmentManagementScreen } from './ui/department-management.js';


// Función para adjuntar los event listeners de navegación a los botones del menú.
function attachNavigationEventListeners() {
    const navigateTasksBtn = document.getElementById('btn-navigate-tasks');
    if (navigateTasksBtn) {
        navigateTasksBtn.addEventListener('click', () => {
            showMainScreen(); // Esta función está en user-management.js
        });
    }

    const navigateDepartmentsBtn = document.getElementById('btn-navigate-departments');
    if (navigateDepartmentsBtn) {
        navigateDepartmentsBtn.addEventListener('click', () => {
            showDepartmentManagementScreen(); // Esta función está en department-management.js
        });
    }

    const navigateUsersBtn = document.getElementById('btn-navigate-users');
    if (navigateUsersBtn) {
        navigateUsersBtn.addEventListener('click', () => {
            showUserManagementScreen(); // Esta función está en user-management.js
        });
    }

    // Event listener para logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Adjuntar event listeners.
document.addEventListener('DOMContentLoaded', () => {
    // Elementos del formulario de registro
    const createBtn = document.getElementById('btn-save-new-user');
    const passwordInput = document.getElementById('new-user-password');
    const confirmPasswordInput = document.getElementById('new-user-confirm-password');
    const formError = document.getElementById('form-error-message');
    const usernameInput = document.getElementById('new-user-username');
    const fullNameInput = document.getElementById('new-user-full-name');
    const showNewUserModalBtn = document.getElementById('btn-show-new-user-modal');
    const closeNewUserModalBtn = document.getElementById('btn-close-new-user-modal');
    const closeSuccessModalBtn = document.getElementById('btn-close-success-modal');
    const cancelNewUserBtn = document.getElementById('btn-cancel-new-user');

    // Elementos del formulario de login
    const loginBtn = document.getElementById('btn-login');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginErrorMessage = document.getElementById('login-error-message');
    const loginScreen = document.getElementById('screen-login');
    const mainScreen = document.getElementById('screen-main');
attachNavigationEventListeners();
    const handleRegisterSubmit = async (event) => {
        event.preventDefault(); // Prevenir el envío por defecto del formulario
        
        console.log('Botón de crear usuario clickeado');

        // Obtener los valores del formulario
        const username = usernameInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const fullName = fullNameInput.value;
        const departmentId = document.getElementById('new-user-department').value;
        
        console.log('Datos del formulario:', { username, password: '***', confirmPassword: '***', fullName, departmentId });
        
        // Final frontend validation before sending
        if (password !== confirmPassword || password.length < 6 || username.length === 0 || fullName.trim().length === 0) {
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

            // Transformar el nombre de usuario a email
            const email = transformUsernameToEmail(username);

            // Actualizar estado de carga
            createBtn.innerHTML = 'Creando usuario...';

            // Llamar a la función de Supabase para crear el usuario
            const result = await createUser({
                email: email,
                password: password,
                username: username,
                full_name: fullName.trim(),
                role: 'Usuario', // Siempre Usuario por defecto
                departamento_id: departmentId || null
            });
            
            if (result && result.success) {
                console.log("Usuario creado correctamente:", result.user);
                hideNewUserModal();
                showUserCreatedSuccessModal();
                // Los campos se limpian automáticamente en hideNewUserModal()
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

   // Conectar el botón 'X' del modal de edición de departamento con la función
    const closeEditDepartmentModalBtn = document.querySelector('[data-modal-close="edit-department-modal"]');
    if (closeEditDepartmentModalBtn) {
        console.log('Event listener para cerrar el modal de edición de departamento agregado.');
        closeEditDepartmentModalBtn.addEventListener('click', () => {
            console.log('Botón de cierre del modal de edición de departamento clickeado.');
            hideEditDepartmentModal();
        });
    }
// Función para manejar el login
    const handleLogin = async (event) => {
        event.preventDefault();
        
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;
        
        // Validar campos
        const validationError = validateLoginFields(username, password);
        if (validationError) {
            loginErrorMessage.textContent = validationError;
            loginErrorMessage.classList.remove('hidden');
            return;
        }
        
        // Limpiar errores previos
        loginErrorMessage.textContent = '';
        loginErrorMessage.classList.add('hidden');
        
        try {
            // Deshabilitar botón durante el proceso
            loginBtn.disabled = true;
            loginBtn.innerHTML = 'Iniciando sesión...';
            loginBtn.classList.add('opacity-50', 'cursor-not-allowed');
            
            // Convertir username a email si es necesario
            const email = transformUsernameToEmail(username);
            
            // Intentar login
            const result = await loginUser(email, password);
            
            if (result.success) {
                console.log('Login exitoso:', result.user);
		await initializeUserSession('screen-main');
                document.getElementById('login-screen').classList.add('hidden');
       		document.getElementById('screen-main').classList.remove('hidden');
                
                // Inicializar módulos que requieren sesión
                initializeTaskManagement();
                initializeUserManagement();
                
                // Limpiar formulario
                loginUsernameInput.value = '';
                loginPasswordInput.value = '';
                
            } else {
                // Error de credenciales
                loginErrorMessage.textContent = 'Credenciales no válidas';
                loginErrorMessage.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            loginErrorMessage.textContent = 'Credenciales no válidas';
            loginErrorMessage.classList.remove('hidden');
        } finally {
            // Rehabilitar botón
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Iniciar Sesión';
            loginBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    };

    // Event listeners para validación en tiempo real
    if (passwordInput && confirmPasswordInput && usernameInput && fullNameInput) {
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
        fullNameInput.addEventListener('input', checkFormValidity);
    }
    
    // Función para cargar departamentos en el select
    const loadDepartments = async () => {
        try {
            console.log('Intentando cargar departamentos...');
            const departments = await getDepartments();
            console.log('Departamentos obtenidos:', departments);
            
            const departmentSelect = document.getElementById('new-user-department');
            
            if (departmentSelect) {
                // Limpiar opciones existentes excepto la primera
                departmentSelect.innerHTML = '<option value="">Sin departamento</option>';
                
                // Agregar departamentos
                if (departments && departments.length > 0) {
                    departments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept.id;
                        option.textContent = dept.nombre;
                        departmentSelect.appendChild(option);
                        console.log(`Departamento agregado: ${dept.nombre}`);
                    });
                } else {
                    console.log('No se encontraron departamentos');
                }
            } else {
                console.error('No se encontró el elemento select de departamentos');
            }
        } catch (error) {
            console.error('Error cargando departamentos:', error);
        }
    };

    // Event listener para mostrar el modal
    if (showNewUserModalBtn) {
        showNewUserModalBtn.addEventListener('click', async () => {
            await loadDepartments();
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

    // Event listener para el botón de login
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // Event listeners para limpiar errores de login al escribir
    if (loginUsernameInput) {
        loginUsernameInput.addEventListener('input', () => {
            if (loginErrorMessage && !loginErrorMessage.classList.contains('hidden')) {
                loginErrorMessage.classList.add('hidden');
            }
        });
    }

    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('input', () => {
            if (loginErrorMessage && !loginErrorMessage.classList.contains('hidden')) {
                loginErrorMessage.classList.add('hidden');
            }
        });
    }

    // Función para manejar logout
    const handleLogout = async () => {
        try {
            await logoutUser();
            
            // Redirigir a pantalla de login y ocultar todas las demás pantallas
            const loginScreen = document.getElementById('screen-login');
            const mainScreen = document.getElementById('screen-main');
            const userManagementScreen = document.getElementById('screen-user-management');
            const departmentManagementScreen = document.getElementById('screen-department-management');
            
            // Ocultar todas las pantallas excepto login
            if (mainScreen) {
                mainScreen.classList.add('hidden');
            }
            if (userManagementScreen) {
                userManagementScreen.classList.add('hidden');
            }
            if (departmentManagementScreen) {
                departmentManagementScreen.classList.add('hidden');
            }
            
            // Mostrar pantalla de login
            if (loginScreen) {
                loginScreen.classList.remove('hidden');
            }
            
            // Limpiar información del usuario
            const currentUserElements = document.querySelectorAll('#current-user, #current-user-user-management, #current-user-department-management');
            currentUserElements.forEach(element => {
                if (element) {
                    element.textContent = '';
                }
            });
            
            console.log('Logout exitoso');
            
        } catch (error) {
            console.error('Error en logout:', error);
        }
    };

    // El event listener de logout se configura dinámicamente en setupHamburgerEventListeners

    // Los event listeners de navegación se configuran dinámicamente en setupHamburgerEventListeners

    // Inicializar la aplicación
    initializeApp();
});

// Función para inicializar la aplicación
async function initializeApp() {
    try {
        // Verificar si hay una sesión activa
        const sessionActive = await hasActiveSession();
        
        if (sessionActive) {
            console.log('Sesión activa detectada, inicializando módulos...');
            
            // Inicializar sesión del usuario
            await initializeUserSession();
            
            // Mostrar pantalla principal
            const loginScreen = document.getElementById('screen-login');
            const mainScreen = document.getElementById('screen-main');
            if (loginScreen && mainScreen) {
                loginScreen.classList.add('hidden');
                mainScreen.classList.remove('hidden');
            }
            
            // Inicializar módulos que requieren sesión
            initializeTaskManagement();
            initializeUserManagement();
            initializeDepartmentManagement();
        } else {
            console.log('No hay sesión activa, mostrando pantalla de login');
            
            // Asegurar que se muestre la pantalla de login
            const loginScreen = document.getElementById('screen-login');
            const mainScreen = document.getElementById('screen-main');
            if (loginScreen && mainScreen) {
                mainScreen.classList.add('hidden');
                loginScreen.classList.remove('hidden');
            }
        }
        
        // Inicializar menús hamburguesa (no requieren sesión)
        initializeHamburgerMenus();
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        
        // En caso de error, mostrar pantalla de login
        const loginScreen = document.getElementById('screen-login');
        const mainScreen = document.getElementById('screen-main');
        if (loginScreen && mainScreen) {
            mainScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
        }
        
        // Inicializar menú hamburguesa unificado
        await initializeHamburgerMenus();
        
        // Establecer pantalla inicial
        currentScreen = 'tasks';
        updateHamburgerMenu();
    }
}

// Variable global para rastrear la pantalla actual
let currentScreen = 'tasks';

// Función para crear el menú hamburguesa
function createHamburgerMenu() {
    return `
        <div class="hamburger-menu">
            <button id="hamburger-button" class="hamburger-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
            <div id="hamburger-dropdown" class="hamburger-dropdown">
                <button id="btn-navigate-tasks" class="hamburger-item">
                    Tareas
                </button>
                <button id="btn-navigate-departments" class="hamburger-item hidden">
                    Departamentos
                </button>
                <button id="btn-navigate-users" class="hamburger-item hidden">
                    Usuarios
                </button>
                <button id="btn-change-password" class="hamburger-item">
                    Cambiar Contraseña
                </button>
                <button id="btn-delete-own-account" class="hamburger-item" style="color: #fca5a5;">
                    Eliminar Mi Cuenta
                </button>
                <button id="btn-help" class="hamburger-item help-item">
                    Ayuda
                </button>
                <button id="btn-logout" class="hamburger-item">
                    Cerrar Sesión
                </button>
            </div>
        </div>
    `;
}

// Función para insertar el menú hamburguesa en la pantalla actual
function insertHamburgerMenu(screenName) {
    const containers = {
        'tasks': document.querySelector('#screen-main #hamburger-menu-container'),
        'users': document.querySelector('#screen-user-management #hamburger-menu-container'),
        'departments': document.querySelector('#screen-department-management #hamburger-menu-container')
    };
    
    // Limpiar todos los contenedores
    Object.values(containers).forEach(container => {
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // Insertar menú en el contenedor de la pantalla actual
    const currentContainer = containers[screenName];
    if (currentContainer) {
        currentContainer.innerHTML = createHamburgerMenu();
        
        // Reconfigurar event listeners después de insertar el HTML
        setupHamburgerEventListeners();
    }
}

// Función para navegar entre pantallas
function navigateToScreen(screenName) {
    // Ocultar todas las pantallas
    const screens = {
        'tasks': document.getElementById('screen-main'),
        'users': document.getElementById('screen-user-management'),
        'departments': document.getElementById('screen-department-management')
    };
    
    // Ocultar todas las pantallas
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.add('hidden');
        }
    });
    
    // Mostrar la pantalla seleccionada
    const targetScreen = screens[screenName];
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        currentScreen = screenName;
        
        // Insertar menú hamburguesa en la pantalla actual
        insertHamburgerMenu(screenName);
        
        // Configurar permisos y actualizar menú
        setupMenuPermissions().then(() => {
            updateHamburgerMenu();
        });
        
        // Cargar datos según la pantalla
        if (screenName === 'users') {
            showUserManagementScreen();
        } else if (screenName === 'departments') {
            showDepartmentManagementScreen();
        } else if (screenName === 'tasks') {
            showMainScreen();
        }
    }
}

// Función para actualizar el menú hamburguesa según la pantalla actual
function updateHamburgerMenu() {
    const tasksBtn = document.getElementById('btn-navigate-tasks');
    const departmentsBtn = document.getElementById('btn-navigate-departments');
    const usersBtn = document.getElementById('btn-navigate-users');
    
    // Resetear estilos
    [tasksBtn, departmentsBtn, usersBtn].forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    
    // Sombrear la pantalla actual
    if (currentScreen === 'tasks' && tasksBtn) {
        tasksBtn.disabled = true;
        tasksBtn.style.opacity = '0.5';
        tasksBtn.style.cursor = 'not-allowed';
    } else if (currentScreen === 'departments' && departmentsBtn) {
        departmentsBtn.disabled = true;
        departmentsBtn.style.opacity = '0.5';
        departmentsBtn.style.cursor = 'not-allowed';
    } else if (currentScreen === 'users' && usersBtn) {
        usersBtn.disabled = true;
        usersBtn.style.opacity = '0.5';
        usersBtn.style.cursor = 'not-allowed';
    }
}

// Función para configurar event listeners del menú hamburguesa
function setupHamburgerEventListeners() {
    const hamburgerButton = document.getElementById('hamburger-button');
    const hamburgerDropdown = document.getElementById('hamburger-dropdown');
    
    // Event listener para el botón hamburguesa
    if (hamburgerButton && hamburgerDropdown) {
        hamburgerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerDropdown.classList.toggle('show');
        });
    }
    
    // Event listeners para navegación
    const navigateTasksBtn = document.getElementById('btn-navigate-tasks');
    if (navigateTasksBtn) {
        navigateTasksBtn.addEventListener('click', () => {
            navigateToScreen('tasks');
        });
    }

    const navigateDepartmentsBtn = document.getElementById('btn-navigate-departments');
    if (navigateDepartmentsBtn) {
        navigateDepartmentsBtn.addEventListener('click', () => {
            navigateToScreen('departments');
        });
    }

    const navigateUsersBtn = document.getElementById('btn-navigate-users');
    if (navigateUsersBtn) {
        navigateUsersBtn.addEventListener('click', () => {
            navigateToScreen('users');
        });
    }
    
    // Event listener para logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Función para inicializar el menú hamburguesa unificado
async function initializeHamburgerMenus() {
    // Insertar menú en la pantalla inicial (tasks)
    insertHamburgerMenu('tasks');
    
    // Configurar permisos de menús según el rol del usuario
    await setupMenuPermissions();
    
    // Actualizar menú inicial
    updateHamburgerMenu();
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hamburger-menu')) {
            const hamburgerDropdown = document.getElementById('hamburger-dropdown');
            if (hamburgerDropdown) {
                hamburgerDropdown.classList.remove('show');
            }
        }
    });
    
    // Cerrar menú al presionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const hamburgerDropdown = document.getElementById('hamburger-dropdown');
            if (hamburgerDropdown) {
                hamburgerDropdown.classList.remove('show');
            }
        }
    });
}