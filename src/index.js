// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal, hideEditDepartmentModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail, checkFormValidity, validateLoginFields } from './ui/validation.js';
import { createUser, loginUser, getCurrentUserProfile, updateLastActivity, getDepartments, logoutUser, hasActiveSession } from './api/supabase.js';
import { initializeTaskManagement } from './ui/tasks.js';
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
            
            // Actualizar elementos de la interfaz con información del usuario
            const currentUserElements = document.querySelectorAll('#current-user, #current-user-user-management, #current-user-department-management');
            currentUserElements.forEach(element => {
                if (element) {
                    element.textContent = profile.full_name || profile.username;
                }
            });
            
            // Actualizar última actividad
            await updateLastActivity();
            
            // Mostrar/ocultar opciones según el rol
            const userManagementBtn = document.getElementById('btn-user-management');
            const departmentManagementBtn = document.getElementById('btn-department-management');
            
            if (userManagementBtn) {
                if (profile.role === 'Administrador') {
                    userManagementBtn.classList.remove('hidden');
                } else {
                    userManagementBtn.classList.add('hidden');
                }
            }
            
            if (departmentManagementBtn) {
                if (profile.role === 'Administrador' || profile.role === 'Responsable') {
                    departmentManagementBtn.classList.remove('hidden');
                } else {
                    departmentManagementBtn.classList.add('hidden');
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

    // Event listeners para botones de logout
    const logoutButtons = document.querySelectorAll('#btn-logout, #btn-logout-user-management, #btn-logout-department-management');
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', handleLogout);
        }
    });

    // Event listener para gestión de usuarios
    const userManagementBtn = document.getElementById('btn-user-management');
    if (userManagementBtn) {
        userManagementBtn.addEventListener('click', () => {
            showUserManagementScreen();
        });
    }

    // Event listener para gestión de departamentos
    const departmentManagementBtn = document.getElementById('btn-department-management');
    if (departmentManagementBtn) {
        departmentManagementBtn.addEventListener('click', () => {
            showDepartmentManagementScreen();
        });
    }

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
        
        // Inicializar menús hamburguesa de todas formas
        initializeHamburgerMenus();
    }
}

// Función para inicializar los menús hamburguesa
function initializeHamburgerMenus() {
    // Menú hamburguesa principal
    const hamburgerButton = document.getElementById('hamburger-button');
    const hamburgerDropdown = document.getElementById('hamburger-dropdown');
    
    // Menú hamburguesa de gestión de usuarios
    const hamburgerButtonUserManagement = document.getElementById('hamburger-button-user-management');
    const hamburgerDropdownUserManagement = document.getElementById('hamburger-dropdown-user-management');
    
    // Menú hamburguesa de gestión de departamentos
    const hamburgerButtonDepartmentManagement = document.getElementById('hamburger-button-department-management');
    const hamburgerDropdownDepartmentManagement = document.getElementById('hamburger-dropdown-department-management');
    
    // Función para cerrar todos los menús
    function closeAllMenus() {
        if (hamburgerDropdown) {
            hamburgerDropdown.classList.remove('show');
        }
        if (hamburgerDropdownUserManagement) {
            hamburgerDropdownUserManagement.classList.remove('show');
        }
        if (hamburgerDropdownDepartmentManagement) {
            hamburgerDropdownDepartmentManagement.classList.remove('show');
        }
    }
    
    // Event listener para el menú principal
    if (hamburgerButton && hamburgerDropdown) {
        hamburgerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            // Cerrar otros menús
            if (hamburgerDropdownUserManagement) {
                hamburgerDropdownUserManagement.classList.remove('show');
            }
            if (hamburgerDropdownDepartmentManagement) {
                hamburgerDropdownDepartmentManagement.classList.remove('show');
            }
            // Toggle del menú actual
            hamburgerDropdown.classList.toggle('show');
        });
    }
    
    // Event listener para el menú de gestión de usuarios
    if (hamburgerButtonUserManagement && hamburgerDropdownUserManagement) {
        hamburgerButtonUserManagement.addEventListener('click', (e) => {
            e.stopPropagation();
            // Cerrar otros menús
            if (hamburgerDropdown) {
                hamburgerDropdown.classList.remove('show');
            }
            if (hamburgerDropdownDepartmentManagement) {
                hamburgerDropdownDepartmentManagement.classList.remove('show');
            }
            // Toggle del menú actual
            hamburgerDropdownUserManagement.classList.toggle('show');
        });
    }
    
    // Event listener para el menú de gestión de departamentos
    if (hamburgerButtonDepartmentManagement && hamburgerDropdownDepartmentManagement) {
        hamburgerButtonDepartmentManagement.addEventListener('click', (e) => {
            e.stopPropagation();
            // Cerrar otros menús
            if (hamburgerDropdown) {
                hamburgerDropdown.classList.remove('show');
            }
            if (hamburgerDropdownUserManagement) {
                hamburgerDropdownUserManagement.classList.remove('show');
            }
            // Toggle del menú actual
            hamburgerDropdownDepartmentManagement.classList.toggle('show');
        });
    }
    
    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hamburger-menu')) {
            closeAllMenus();
        }
    });
    
    // Cerrar menús al presionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllMenus();
        }
    });
}