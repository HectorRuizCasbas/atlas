// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal, hideEditDepartmentModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail, checkFormValidity, validateLoginFields } from './ui/validation.js';
import { createUser, loginUser, getCurrentUserProfile, updateLastActivity, getDepartments, logoutUser, hasActiveSession, getAvailableResponsibleUsers, createDepartmentWithResponsible, getAdministrators } from './api/supabase.js';
import { initializeTaskManagement, toggleViewMode } from './ui/tasks.js';
import { initializeUserManagement, showUserManagementScreen } from './ui/user-management.js';
import { initializeDepartmentManagement, showDepartmentManagementScreen } from './ui/department-management.js';

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

    // Función para inicializar la sesión del usuario
    const initializeUserSession = async () => {
        try {
            const profile = await getCurrentUserProfile();
            
            if (!profile) {
                console.error('No se pudo obtener el perfil del usuario');
                return;
            }
            
            console.log('Perfil del usuario obtenido:', profile);
            
            // Actualizar elementos de la interfaz con información del usuario
            const currentUserElements = document.querySelectorAll('#current-user, #current-user-user-management, #current-user-department-management');
            const displayName = profile.full_name || profile.username || 'Usuario';
            
            currentUserElements.forEach(element => {
                if (element) {
                    element.textContent = displayName;
                    console.log(`Elemento actualizado: ${element.id} = ${displayName}`);
                }
            });
            
            // Actualizar última actividad
            await updateLastActivity();
            
            // Mostrar/ocultar opciones según el rol
            const navigateUsersBtn = document.getElementById('btn-navigate-users');
            const navigateDepartmentsBtn = document.getElementById('btn-navigate-departments');
            
            if (navigateUsersBtn) {
                if (profile.role === 'Administrador') {
                    navigateUsersBtn.classList.remove('hidden');
                } else {
                    navigateUsersBtn.classList.add('hidden');
                }
            }
            
            if (navigateDepartmentsBtn) {
                if (profile.role === 'Administrador' || profile.role === 'Responsable') {
                    navigateDepartmentsBtn.classList.remove('hidden');
                } else {
                    navigateDepartmentsBtn.classList.add('hidden');
                }
            }
            
            console.log('Sesión inicializada para:', profile);
            
        } catch (error) {
            console.error('Error inicializando sesión:', error);
        }
    };

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
                
                // Obtener y mostrar información del usuario
                await initializeUserSession();
                
                // Redirigir a la página principal
                loginScreen.classList.add('hidden');
                mainScreen.classList.remove('hidden');
                
                // Inicializar módulos que requieren sesión
                await initializeTaskManagement();
                initializeUserManagement();
                
                // Inicializar toggle de vista de tareas
                const toggleViewBtn = document.getElementById('btn-toggle-view');
                if (toggleViewBtn) {
                    toggleViewBtn.addEventListener('click', toggleViewMode);
                }
                
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
            // Cerrar sesión en Supabase
            await logoutUser();
            
            // Limpiar estado de la UI
            clearUIState();
            
            // Limpiar formulario de login
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            
            // Mostrar mensaje de logout exitoso
            const loginMessage = document.getElementById('login-message');
            if (loginMessage) {
                loginMessage.textContent = 'Sesión cerrada correctamente';
                loginMessage.className = 'text-green-400 text-sm mt-2';
                setTimeout(() => {
                    loginMessage.textContent = '';
                    loginMessage.className = '';
                }, 3000);
            }
            
            console.log('Logout exitoso');
            
        } catch (error) {
            console.error('Error en logout:', error);
        }
    };

    // El event listener de logout se configura dinámicamente en setupHamburgerEventListeners

    // Los event listeners de navegación se configuran dinámicamente en setupHamburgerEventListeners

    // Función para cargar usuarios responsables disponibles
    const loadAvailableResponsibleUsers = async () => {
        try {
            console.log('Cargando usuarios responsables disponibles...');
            const users = await getAvailableResponsibleUsers();
            console.log('Usuarios responsables obtenidos:', users);
            
            const responsibleSelect = document.getElementById('new-department-responsible');
            
            if (responsibleSelect) {
                // Limpiar opciones existentes excepto la primera
                responsibleSelect.innerHTML = '<option value="">Seleccionar responsable...</option>';
                
                // Agregar usuarios disponibles
                if (users && users.length > 0) {
                    users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = `${user.full_name} (${user.username})`;
                        if (user.departamentos && user.departamentos.nombre) {
                            option.textContent += ` - Actual: ${user.departamentos.nombre}`;
                        }
                        responsibleSelect.appendChild(option);
                        console.log(`Usuario responsable agregado: ${user.full_name}`);
                    });
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No hay usuarios responsables disponibles';
                    option.disabled = true;
                    responsibleSelect.appendChild(option);
                    console.log('No se encontraron usuarios responsables disponibles');
                }
            } else {
                console.error('No se encontró el elemento select de responsables');
            }
        } catch (error) {
            console.error('Error cargando usuarios responsables:', error);
        }
    };

    // Función para mostrar el modal de nuevo departamento
    const showNewDepartmentModal = async () => {
        const modal = document.getElementById('new-department-modal');
        if (modal) {
            await loadAvailableResponsibleUsers();
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    };

    // Función para ocultar el modal de nuevo departamento
    const hideNewDepartmentModal = () => {
        const modal = document.getElementById('new-department-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            
            // Limpiar formulario
            const form = document.getElementById('new-department-form');
            if (form) {
                form.reset();
            }
        }
    };

    // Función para manejar la creación de departamento
    const handleCreateDepartment = async (event) => {
        event.preventDefault();
        
        const nameInput = document.getElementById('new-department-name');
        const descriptionInput = document.getElementById('new-department-description');
        const responsibleSelect = document.getElementById('new-department-responsible');
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const responsibleId = responsibleSelect.value;
        
        // Validación básica
        if (!name) {
            alert('El nombre del departamento es obligatorio');
            return;
        }
        
        if (!responsibleId) {
            alert('Debe seleccionar un responsable para el departamento');
            return;
        }
        
        try {
            console.log('Creando departamento:', { name, description, responsibleId });
            
            const result = await createDepartmentWithResponsible({
                nombre: name,
                descripcion: description,
                responsable_id: responsibleId
            });
            
            if (result.success) {
                console.log('Departamento creado exitosamente:', result.department);
                hideNewDepartmentModal();
                
                // Mostrar mensaje de éxito
                alert('Departamento creado exitosamente');
                
                // Recargar la pantalla de departamentos si estamos en ella
                if (currentScreen === 'departments') {
                    showDepartmentManagementScreen();
                }
            } else {
                console.error('Error creando departamento:', result.error);
                alert('Error creando departamento: ' + result.error);
            }
        } catch (error) {
            console.error('Error en la creación del departamento:', error);
            alert('Error inesperado: ' + error.message);
        }
    };

    // Event listener para el botón de nuevo departamento
    document.addEventListener('click', (event) => {
        if (event.target.id === 'btn-new-department') {
            showNewDepartmentModal();
        }
    });

    // Event listeners para el modal de nuevo departamento
    const newDepartmentForm = document.getElementById('new-department-form');
    if (newDepartmentForm) {
        newDepartmentForm.addEventListener('submit', handleCreateDepartment);
    }

    // Event listener para cerrar el modal de nuevo departamento
    document.addEventListener('click', (event) => {
        if (event.target.getAttribute('data-modal-close') === 'new-department-modal') {
            hideNewDepartmentModal();
        }
    });

    // Event listener para cerrar el modal de ayuda
    const closeHelpModalBtn = document.getElementById('btn-close-help-modal');
    if (closeHelpModalBtn) {
        closeHelpModalBtn.addEventListener('click', hideHelpModal);
    }
    
    // Event listener para cerrar el modal de ayuda al hacer clic fuera
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                hideHelpModal();
            }
        });
    }
    
    // Inicializar la aplicación
    initializeApp();
});

// Función para inicializar la aplicación
async function initializeApp() {
    try {
        // Limpiar estado de UI al inicializar (especialmente importante en F5)
        clearUIState();
        
        console.log('Aplicación inicializada, mostrando pantalla de login');
        
        // Siempre mostrar la pantalla de login al iniciar
        const loginScreen = document.getElementById('screen-login');
        const mainScreen = document.getElementById('screen-main');
        if (loginScreen && mainScreen) {
            mainScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
        }
        
        // Inicializar menús hamburguesa básicos sin permisos
        initializeBasicHamburgerMenus();
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        
        // En caso de error, mostrar pantalla de login
        const loginScreen = document.getElementById('screen-login');
        const mainScreen = document.getElementById('screen-main');
        if (loginScreen && mainScreen) {
            mainScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
        }
        
        // Inicializar menú hamburguesa básico sin permisos
        initializeBasicHamburgerMenus();
        
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
        'tasks': document.querySelector('#screen-main #unified-hamburger-menu'),
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
    } else {
        console.error(`No se encontró el contenedor del menú hamburguesa para la pantalla: ${screenName}`);
    }
}

// Función para navegar entre pantallas
function navigateToScreen(screenName) {
    console.log(`Navegando a la pantalla: ${screenName}`);
    
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
        console.log(`Insertando menú hamburguesa para: ${screenName}`);
        insertHamburgerMenu(screenName);
        
        // Configurar permisos y actualizar menú
        setupMenuPermissions().then(() => {
            updateHamburgerMenu();
            console.log(`Menú hamburguesa configurado para: ${screenName}`);
        });
        
        // Cargar datos según la pantalla
        if (screenName === 'users') {
            showUserManagementScreen();
        } else if (screenName === 'departments') {
            showDepartmentManagementScreen();
        } else if (screenName === 'tasks') {
            // Para tasks no necesitamos llamar showMainScreen ya que no existe
            console.log('Pantalla de tareas mostrada');
        }
    } else {
        console.error(`No se encontró la pantalla: ${screenName}`);
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
        // Remover event listeners existentes para evitar duplicados
        hamburgerButton.replaceWith(hamburgerButton.cloneNode(true));
        const newHamburgerButton = document.getElementById('hamburger-button');
        
        newHamburgerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerDropdown.classList.toggle('show');
        });
        
        console.log('Event listener del botón hamburguesa configurado correctamente');
    } else {
        console.error('No se encontraron elementos del menú hamburguesa:', {
            button: !!hamburgerButton,
            dropdown: !!hamburgerDropdown
        });
    }
    
    // Event listeners para navegación
    const navigateTasksBtn = document.getElementById('btn-navigate-tasks');
    if (navigateTasksBtn) {
        navigateTasksBtn.addEventListener('click', () => {
            hamburgerDropdown.classList.remove('show');
            navigateToScreen('tasks');
        });
    }

    const navigateDepartmentsBtn = document.getElementById('btn-navigate-departments');
    if (navigateDepartmentsBtn) {
        navigateDepartmentsBtn.addEventListener('click', () => {
            hamburgerDropdown.classList.remove('show');
            navigateToScreen('departments');
        });
    }

    const navigateUsersBtn = document.getElementById('btn-navigate-users');
    if (navigateUsersBtn) {
        navigateUsersBtn.addEventListener('click', () => {
            hamburgerDropdown.classList.remove('show');
            navigateToScreen('users');
        });
    }
    
    // Event listener para logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            hamburgerDropdown.classList.remove('show');
            await handleGlobalLogout();
        });
    }
    
    // Event listeners para otras opciones del menú
    const changePasswordBtn = document.getElementById('btn-change-password');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            hamburgerDropdown.classList.remove('show');
            // Aquí se puede agregar la funcionalidad de cambiar contraseña
            console.log('Cambiar contraseña clickeado');
        });
    }
    
    const deleteAccountBtn = document.getElementById('btn-delete-own-account');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            hamburgerDropdown.classList.remove('show');
            // Aquí se puede agregar la funcionalidad de eliminar cuenta
            console.log('Eliminar cuenta clickeado');
        });
    }
    
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            hamburgerDropdown.classList.remove('show');
            showHelpModal();
        });
    }
}

// Función para inicializar menús hamburguesa básicos (sin permisos)
function initializeBasicHamburgerMenus() {
    // Insertar menú en la pantalla inicial (tasks)
    insertHamburgerMenu('tasks');
    
    // Ocultar botones de navegación por defecto
    const departmentsBtn = document.getElementById('btn-navigate-departments');
    const usersBtn = document.getElementById('btn-navigate-users');
    if (departmentsBtn) departmentsBtn.classList.add('hidden');
    if (usersBtn) usersBtn.classList.add('hidden');
    
    // Actualizar menú inicial
    updateHamburgerMenu();
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        const hamburgerDropdown = document.getElementById('hamburger-dropdown');
        const hamburgerButton = document.getElementById('hamburger-button');
        
        if (hamburgerDropdown && hamburgerButton && 
            !hamburgerDropdown.contains(e.target) && 
            !hamburgerButton.contains(e.target)) {
            hamburgerDropdown.classList.remove('show');
        }
    });
}

// Función para inicializar el menú hamburguesa unificado (con permisos)
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

// Función para configurar permisos de menús según el rol del usuario
async function setupMenuPermissions() {
    try {
        const currentProfile = await getCurrentUserProfile();
        if (!currentProfile) return;
        
        const userRole = currentProfile.role;
        
        const departmentsBtn = document.getElementById('btn-navigate-departments');
        const usersBtn = document.getElementById('btn-navigate-users');
        
        // Configurar visibilidad según el rol
        if (userRole === 'Administrador') {
            // Administrador puede ver todo
            if (departmentsBtn) departmentsBtn.classList.remove('hidden');
            if (usersBtn) usersBtn.classList.remove('hidden');
        } else if (userRole === 'Responsable') {
            // Responsable puede ver departamentos pero no usuarios
            if (departmentsBtn) departmentsBtn.classList.remove('hidden');
            if (usersBtn) usersBtn.classList.add('hidden');
        } else {
            // Coordinador y Usuario no pueden ver departamentos ni usuarios
            if (departmentsBtn) departmentsBtn.classList.add('hidden');
            if (usersBtn) usersBtn.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Error configurando permisos de menú:', error);
    }
}

// Función para limpiar el estado de la UI
function clearUIState() {
    // Ocultar todas las pantallas excepto login
    const screens = [
        'screen-main',
        'screen-user-management', 
        'screen-department-management'
    ];
    
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('hidden');
        }
    });
    
    // Mostrar pantalla de login
    const loginScreen = document.getElementById('screen-login');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
    
    // Limpiar cualquier información de usuario mostrada
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = '';
    }
    
    // Cerrar cualquier menú hamburguesa abierto
    const hamburgerDropdowns = document.querySelectorAll('.hamburger-dropdown');
    hamburgerDropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
    });
    
    // Limpiar permisos de menú hamburguesa - ocultar todos los botones de navegación
    // NOTA: No ocultar aquí, se configurarán en setupMenuPermissions según el rol
}

// Función para mostrar el modal de ayuda
async function showHelpModal() {
    const helpModal = document.getElementById('help-modal');
    const helpContent = document.getElementById('help-content');
    
    if (helpModal && helpContent) {
        // Mostrar modal con contenido de carga
        helpContent.innerHTML = '<div class="flex items-center justify-center p-8"><div class="text-blue-300">Cargando ayuda...</div></div>';
        helpModal.classList.remove('hidden');
        helpModal.classList.add('flex');
        
        // Generar contenido de ayuda según la pantalla actual
        const content = await generateHelpContent();
        helpContent.innerHTML = content;
    }
}

// Función para ocultar el modal de ayuda
function hideHelpModal() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.classList.add('hidden');
        helpModal.classList.remove('flex');
    }
}

// Función para generar contenido de ayuda según la pantalla actual
async function generateHelpContent() {
    let content = '';
    
    if (currentScreen === 'tasks') {
        content = await generateTasksHelpContent();
    } else if (currentScreen === 'users') {
        content = await generateUsersHelpContent();
    } else if (currentScreen === 'departments') {
        content = generateDepartmentsHelpContent();
    } else {
        content = generateGeneralHelpContent();
    }
    
    return content;
}

// Contenido de ayuda para la página de Tareas
async function generateTasksHelpContent() {
    let administratorsSection = '';
    
    try {
        // Intentar obtener la lista de administradores
        const administrators = await getAdministrators();
        
        if (administrators && administrators.length > 0) {
            administratorsSection = `
                <div class="help-section">
                    <h3>👨‍💼 Contactar Administradores</h3>
                    <p>En caso de dudas o problemas con las tareas, puedes contactar a cualquiera de los siguientes administradores del sistema:</p>
                    <div class="mt-3 space-y-2">
                        ${administrators.map(admin => `
                            <div class="help-feature">
                                <strong>${admin.full_name || admin.username}</strong>
                                <div class="text-sm text-slate-300 ml-4">
                                    <div>📧 ${admin.email || admin.username + '@zelenza.com'}</div>
                                    ${admin.departamentos ? `<div>🏢 ${admin.departamentos.nombre}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error obteniendo administradores para ayuda de tareas:', error);
        // Si hay error, mostrar mensaje genérico
        administratorsSection = `
            <div class="help-section">
                <h3>👨‍💼 Contactar Administradores</h3>
                <p>En caso de dudas o problemas, contacta a los administradores del sistema a través del email corporativo @zelenza.com</p>
            </div>
        `;
    }
    
    return `
        <div class="help-section">
            <h3>🎯 Gestión de Tareas</h3>
            <p>Esta pantalla te permite crear, gestionar y hacer seguimiento de todas las tareas del sistema.</p>
        </div>
        
        ${administratorsSection}
        
        <div class="help-section">
            <h3>➕ Crear Nueva Tarea</h3>
            <div class="help-feature">
                <strong>Título:</strong> Nombre descriptivo de la tarea (obligatorio)
            </div>
            <div class="help-feature">
                <strong>Descripción:</strong> Detalles adicionales sobre la tarea (opcional)
            </div>
            <div class="help-feature">
                <strong>Prioridad:</strong> Urgente, Alta, Media, Baja
            </div>
            <div class="help-feature">
                <strong>Departamento:</strong> Asignar a un departamento específico
            </div>
            <div class="help-feature">
                <strong>Asignado a:</strong> Usuario responsable de la tarea
            </div>
            <div class="help-feature">
                <strong>Tarea privada:</strong> Solo visible para el creador (solo si eres creador y asignado)
            </div>
        </div>
        
        <div class="help-section">
            <h3>🔍 Filtrar Tareas</h3>
            <ul>
                <li><strong>Buscar por texto:</strong> Filtra por título o descripción</li>
                <li><strong>Estado:</strong> Sin iniciar, En progreso, En espera, Finalizada</li>
                <li><strong>Prioridad:</strong> Filtra por nivel de prioridad</li>
                <li><strong>Asignado a:</strong> Filtra por usuario responsable</li>
                <li><strong>Departamento:</strong> Filtra por departamento (si tienes permisos)</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>📋 Vistas de Tareas</h3>
            <div class="help-feature">
                <strong>Vista de Tarjetas:</strong> Visualización en formato de tarjetas con información resumida
            </div>
            <div class="help-feature">
                <strong>Vista de Tabla:</strong> Visualización en tabla con todos los detalles
            </div>
        </div>
        
        <div class="help-section">
            <h3>✏️ Editar Tareas</h3>
            <p>Haz clic en cualquier tarea para:</p>
            <ul>
                <li>Modificar título, descripción y configuración</li>
                <li>Cambiar estado y prioridad</li>
                <li>Reasignar a otro usuario</li>
                <li>Usar el chat integrado para comunicación</li>
                <li>Ver historial completo de cambios</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>💬 Sistema de Chat</h3>
            <p>Cada tarea incluye un chat integrado para:</p>
            <ul>
                <li>Comunicación entre usuarios</li>
                <li>Registro automático de cambios</li>
                <li>Historial cronológico completo</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>🔒 Permisos y Visibilidad</h3>
            <div class="help-feature">
                <strong>Tareas Públicas:</strong> Visibles según tu rol y departamento
            </div>
            <div class="help-feature">
                <strong>Tareas Privadas:</strong> Solo visibles para el creador
            </div>
            <div class="help-feature">
                <strong>Notificaciones:</strong> Recibes alertas de tareas asignadas a ti
            </div>
        </div>
    `;
}

// Contenido de ayuda para la página de Usuarios
async function generateUsersHelpContent() {
    let administratorsSection = '';
    
    try {
        // Intentar obtener la lista de administradores
        const administrators = await getAdministrators();
        
        if (administrators && administrators.length > 0) {
            administratorsSection = `
                <div class="help-section">
                    <h3>👨‍💼 Contactar Administradores</h3>
                    <p>En caso de dudas o problemas, puedes contactar a cualquiera de los siguientes administradores del sistema:</p>
                    <div class="mt-3 space-y-2">
                        ${administrators.map(admin => `
                            <div class="help-feature">
                                <strong>${admin.full_name || admin.username}</strong>
                                <div class="text-sm text-slate-300 ml-4">
                                    <div>📧 ${admin.email || admin.username + '@zelenza.com'}</div>
                                    ${admin.departamentos ? `<div>🏢 ${admin.departamentos.nombre}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error obteniendo administradores para ayuda:', error);
        // Si hay error, mostrar mensaje genérico
        administratorsSection = `
            <div class="help-section">
                <h3>👨‍💼 Contactar Administradores</h3>
                <p>En caso de dudas o problemas, contacta a los administradores del sistema a través del email corporativo @zelenza.com</p>
            </div>
        `;
    }
    
    return `
        <div class="help-section">
            <h3>👥 Gestión de Usuarios</h3>
            <p>Esta pantalla permite administrar todos los usuarios del sistema. Solo disponible para Administradores.</p>
        </div>
        
        ${administratorsSection}
        
        <div class="help-section">
            <h3>➕ Crear Nuevo Usuario</h3>
            <div class="help-feature">
                <strong>Nombre Completo:</strong> Nombre y apellidos del usuario
            </div>
            <div class="help-feature">
                <strong>Usuario de Acceso:</strong> Nombre de usuario para login (se convierte a email @zelenza.com)
            </div>
            <div class="help-feature">
                <strong>Contraseña:</strong> Mínimo 6 caracteres
            </div>
            <div class="help-feature">
                <strong>Departamento:</strong> Asignación opcional a departamento
            </div>
        </div>
        
        <div class="help-section">
            <h3>🔍 Filtros de Usuarios</h3>
            <ul>
                <li><strong>Buscar por Nombre:</strong> Filtra por nombre completo</li>
                <li><strong>Filtrar por Rol:</strong> Usuario, Coordinador, Responsable, Administrador</li>
                <li><strong>Filtrar por Departamento:</strong> Usuarios de departamentos específicos</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>👤 Roles de Usuario</h3>
            <div class="help-feature">
                <strong>Usuario:</strong> Acceso básico a tareas asignadas
            </div>
            <div class="help-feature">
                <strong>Coordinador:</strong> Puede ver tareas de su departamento
            </div>
            <div class="help-feature">
                <strong>Responsable:</strong> Gestiona departamentos y usuarios
            </div>
            <div class="help-feature">
                <strong>Administrador:</strong> Acceso completo al sistema
            </div>
        </div>
        
        <div class="help-section">
            <h3>✏️ Editar Usuarios</h3>
            <p>Desde la tabla de usuarios puedes:</p>
            <ul>
                <li>Cambiar rol del usuario</li>
                <li>Modificar nombre completo</li>
                <li>Reasignar departamento</li>
                <li>Cambiar contraseña</li>
                <li>Ver información de actividad</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>🗑️ Eliminar Usuarios</h3>
            <div class="help-feature">
                <strong>Condiciones:</strong> Solo usuarios offline pueden ser eliminados
            </div>
            <div class="help-feature">
                <strong>Protección:</strong> No se puede eliminar el último administrador
            </div>
        </div>
        
        <div class="help-section">
            <h3>👁️ Visibilidad de Usuarios</h3>
            <p>El botón "👁️" muestra:</p>
            <ul>
                <li>Usuarios sobre los que tienes visibilidad</li>
                <li>Usuarios que tienen visibilidad sobre ti</li>
                <li>Relaciones jerárquicas del sistema</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>🔐 Validación de Email</h3>
            <div class="help-feature">
                <strong>Dominio:</strong> Solo emails @zelenza.com son válidos
            </div>
            <div class="help-feature">
                <strong>Conversión:</strong> Nombres de usuario se convierten automáticamente
            </div>
        </div>
    `;
}

// Contenido de ayuda para la página de Departamentos
function generateDepartmentsHelpContent() {
    return `
        <div class="help-section">
            <h3>🏢 Gestión de Departamentos</h3>
            <p>Esta pantalla permite administrar departamentos. Disponible para Administradores y Responsables.</p>
        </div>
        
        <div class="help-section">
            <h3>➕ Crear Nuevo Departamento</h3>
            <div class="help-feature">
                <strong>Nombre:</strong> Nombre descriptivo del departamento
            </div>
            <div class="help-feature">
                <strong>Descripción:</strong> Información adicional sobre el departamento
            </div>
            <div class="help-feature">
                <strong>Responsable:</strong> Usuario con rol 'Responsable' que gestionará el departamento
            </div>
        </div>
        
        <div class="help-section">
            <h3>✏️ Editar Departamentos</h3>
            <p>Desde la tabla puedes:</p>
            <ul>
                <li>Modificar nombre y descripción</li>
                <li>Ver lista de usuarios del departamento</li>
                <li>Gestionar asignaciones de usuarios</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>👥 Usuarios del Departamento</h3>
            <p>El sistema muestra:</p>
            <ul>
                <li>Todos los usuarios asignados al departamento</li>
                <li>Roles de cada usuario</li>
                <li>Información de contacto</li>
            </ul>
        </div>
    `;
}

// Contenido de ayuda general
function generateGeneralHelpContent() {
    return `
        <div class="help-section">
            <h3>🏠 Atlas - Sistema de Gestión</h3>
            <p>Bienvenido al sistema Atlas, tu herramienta completa para gestión de tareas y usuarios.</p>
        </div>
        
        <div class="help-section">
            <h3>🧭 Navegación</h3>
            <p>Usa el menú hamburguesa (☰) en la esquina superior derecha para:</p>
            <ul>
                <li>Navegar entre secciones</li>
                <li>Cambiar tu contraseña</li>
                <li>Acceder a esta ayuda</li>
                <li>Cerrar sesión</li>
            </ul>
        </div>
        
        <div class="help-section">
            <h3>🔔 Notificaciones</h3>
            <div class="help-feature">
                <strong>Indicador:</strong> El icono de campana muestra notificaciones pendientes
            </div>
            <div class="help-feature">
                <strong>Tipos:</strong> Tareas asignadas, cambios de estado, mensajes
            </div>
        </div>
        
        <div class="help-section">
            <h3>👤 Perfil de Usuario</h3>
            <p>Tu nombre de usuario aparece en la barra superior y muestra:</p>
            <ul>
                <li>Nombre completo o usuario</li>
                <li>Acceso a información personal</li>
            </ul>
        </div>
    `;
}

// Función global para manejar logout (accesible desde cualquier contexto)
async function handleGlobalLogout() {
    try {
        // Cerrar sesión en Supabase
        await logoutUser();
        
        // Limpiar estado de la UI
        clearUIState();
        
        // Ocultar botones de navegación específicamente en logout
        const departmentsBtn = document.getElementById('btn-navigate-departments');
        const usersBtn = document.getElementById('btn-navigate-users');
        if (departmentsBtn) departmentsBtn.classList.add('hidden');
        if (usersBtn) usersBtn.classList.add('hidden');
        
        // Limpiar formulario de login
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // Mostrar mensaje de logout exitoso
        const loginMessage = document.getElementById('login-message');
        if (loginMessage) {
            loginMessage.textContent = 'Sesión cerrada correctamente';
            loginMessage.className = 'text-green-400 text-sm mt-2';
            setTimeout(() => {
                loginMessage.textContent = '';
                loginMessage.className = '';
            }, 3000);
        }
        
        console.log('Logout exitoso');
        
    } catch (error) {
        console.error('Error en logout:', error);
    }
}