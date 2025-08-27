// src/index.js

// Importar todas las funciones de los módulos.
import { showNewUserModal, hideNewUserModal, showUserCreatedSuccessModal, hideUserCreatedSuccessModal } from './ui/modal.js';
import { validatePasswordLength, validatePasswordMatch, transformUsernameToEmail, checkFormValidity, validateLoginFields } from './ui/validation.js';
import { createUser, loginUser, getCurrentUserProfile, updateLastActivity, getDepartments, logoutUser } from './api/supabase.js';
import { initializeTaskManagement } from './ui/tasks.js';

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
        const role = document.getElementById('new-user-role').value;
        const departmentId = document.getElementById('new-user-department').value;
        
        console.log('Datos del formulario:', { username, password: '***', confirmPassword: '***', fullName, role, departmentId });
        
        // Final frontend validation before sending
        if (password !== confirmPassword || password.length < 6 || username.length === 0 || fullName.trim().length === 0 || role.length === 0) {
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
                username: username,
                full_name: fullName.trim(),
                role: role,
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

    // Función para inicializar la sesión del usuario
    const initializeUserSession = async () => {
        try {
            const profile = await getCurrentUserProfile();
            
            // Actualizar elementos de la interfaz con información del usuario
            const currentUserElements = document.querySelectorAll('#current-user, #current-user-user-management');
            currentUserElements.forEach(element => {
                if (element) {
                    element.textContent = profile.full_name || profile.username;
                }
            });
            
            // Actualizar última actividad
            await updateLastActivity();
            
            // Mostrar/ocultar opciones según el rol
            const userManagementBtn = document.getElementById('btn-user-management');
            if (userManagementBtn) {
                if (profile.role === 'Administrador') {
                    userManagementBtn.classList.remove('hidden');
                } else {
                    userManagementBtn.classList.add('hidden');
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
            const email = await transformUsernameToEmail(username);
            
            // Intentar login
            const result = await loginUser(email, password);
            
            if (result.success) {
                console.log('Login exitoso:', result.user);
                
                // Obtener y mostrar información del usuario
                await initializeUserSession();
                
                // Redirigir a la página principal
                loginScreen.classList.add('hidden');
                mainScreen.classList.remove('hidden');
                
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
        const roleInput = document.getElementById('new-user-role');
        
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
        
        if (roleInput) {
            roleInput.addEventListener('change', checkFormValidity);
        }
    }
    
    // Función para cargar departamentos en el select
    const loadDepartments = async () => {
        try {
            const departments = await getDepartments();
            const departmentSelect = document.getElementById('new-user-department');
            
            if (departmentSelect) {
                // Limpiar opciones existentes excepto la primera
                departmentSelect.innerHTML = '<option value="">Sin departamento</option>';
                
                // Agregar departamentos
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.nombre;
                    departmentSelect.appendChild(option);
                });
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
            
            // Redirigir a pantalla de login
            const loginScreen = document.getElementById('screen-login');
            const mainScreen = document.getElementById('screen-main');
            const userManagementScreen = document.getElementById('screen-user-management');
            
            if (loginScreen && mainScreen) {
                mainScreen.classList.add('hidden');
                loginScreen.classList.remove('hidden');
            }
            
            if (userManagementScreen) {
                userManagementScreen.classList.add('hidden');
            }
            
            // Limpiar información del usuario
            const currentUserElements = document.querySelectorAll('#current-user, #current-user-user-management');
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
    const logoutButtons = document.querySelectorAll('#btn-logout, #btn-logout-user-management');
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', handleLogout);
        }
    });

    // Inicializar la gestión de tareas
    initializeTaskManagement();
});