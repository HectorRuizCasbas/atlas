document.addEventListener('DOMContentLoaded', async () => {
    // Storage
    let ALL_TASKS_CACHE = [];
    let ALL_USERS_CACHE = [];
    let currentViewMode = 'cards'; // 'cards' o 'table'
    
    // 🔄 NUEVO: Sistema de preferencias del usuario
    let userPreferences = {};
    
    // 🔄 NUEVO: Sistema de actualización en tiempo real de configuración
    let lastConfigHash = null;
    let configUpdateInterval = null;
    
    // Configurar la barra de título personalizada
    setupCustomTitleBar();
    
    // Función para configurar la barra de título personalizada
    function setupCustomTitleBar() {
        // Configurar botones de la pantalla principal
        const minimizeBtn = document.getElementById('minimize-btn');
        const maximizeBtn = document.getElementById('maximize-btn');
        const closeBtn = document.getElementById('close-btn');
        
        // Función helper para configurar botones
        function setupButton(button, action) {
            if (button) {
                button.addEventListener('click', action);
            }
        }
        
        // Configurar botones de la pantalla principal
        setupButton(minimizeBtn, () => window.api.minimizeWindow());
        setupButton(maximizeBtn, () => window.api.maximizeWindow());
        setupButton(closeBtn, () => window.api.closeWindow());
    }
    
    // 🔄 NUEVO: Funciones para manejar preferencias del usuario
    async function loadUserPreferences() {
        try {
            const savedPreferences = localStorage.getItem(`userPreferences_${CURRENT_USER}`);
            if (savedPreferences) {
                userPreferences = JSON.parse(savedPreferences);
                // Aplicar preferencia de vista
                if (userPreferences.viewMode) {
                    currentViewMode = userPreferences.viewMode;
                }
            }
        } catch (error) {
            console.error('Error al cargar preferencias del usuario:', error);
        }
    }
    
    async function saveUserPreferences() {
        try {
            if (CURRENT_USER) {
                userPreferences.viewMode = currentViewMode;
                localStorage.setItem(`userPreferences_${CURRENT_USER}`, JSON.stringify(userPreferences));
            }
        } catch (error) {
            console.error('Error al guardar preferencias del usuario:', error);
        }
    }
    
    // Función para aplicar la vista actual y actualizar el botón
    function applyCurrentView() {
        if (currentViewMode === 'table') {
            // Aplicar vista de tabla
            if (tasksGrid) tasksGrid.classList.add('hidden');
            if (tasksTable) tasksTable.classList.remove('hidden');
            if (iconTable) iconTable.classList.remove('hidden');
            if (iconCards) iconCards.classList.add('hidden');
            if (viewModeText) viewModeText.textContent = 'Vista de Tarjetas';
            initTableSorting();
        } else {
            // Aplicar vista de tarjetas
            if (tasksTable) tasksTable.classList.add('hidden');
            if (tasksGrid) tasksGrid.classList.remove('hidden');
            if (iconCards) iconCards.classList.remove('hidden');
            if (iconTable) iconTable.classList.add('hidden');
            if (viewModeText) viewModeText.textContent = 'Vista de Tabla';
        }
    }
    
    // Función para generar un hash de la configuración actual
    function generateConfigHash() {
        if (!ALL_USERS_CACHE || ALL_USERS_CACHE.length === 0) return null;
        
        // Crear un hash simple basado en la configuración de usuarios
        const configString = ALL_USERS_CACHE.map(user => 
            `${user.username}:${user.role}:${(user.supervisedUsers || []).sort().join(',')}`
        ).sort().join('|');
        
        // Hash simple usando el método de multiplicación
        let hash = 0;
        for (let i = 0; i < configString.length; i++) {
            const char = configString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a entero de 32 bits
        }
        return hash.toString();
    }
    
    // Función para verificar cambios en la configuración
    async function checkConfigChanges() {
        try {
            const currentUsers = await window.api.getUsers();
            const currentHash = generateConfigHash();
            
            // Si es la primera vez, solo guardar el hash
            if (lastConfigHash === null) {
                lastConfigHash = currentHash;
                ALL_USERS_CACHE = currentUsers;
                return;
            }
            
            // Si hay cambios en la configuración
            if (currentHash !== lastConfigHash) {
                console.log('🔄 Cambios detectados en la configuración de usuarios');
                
                // Actualizar el caché
                ALL_USERS_CACHE = currentUsers;
                lastConfigHash = currentHash;
                
                // Actualizar la interfaz según la pantalla actual
                const currentScreen = getCurrentScreen();
                
                if (currentScreen === 'main') {
                    // 🔄 MEJORA: Actualizar los combos de asignación y filtros automáticamente
                    await populateAssignedUsers();
                    await renderTasks();
                    updateNotificationsIndicator();
                    
                    // 🔄 NUEVO: Actualizar también las notificaciones de la pantalla de gestión de usuarios
                    updateNotificationsIndicatorUserManagement();
                    
                    // 🔄 NUEVO: Actualizar también los filtros de usuarios en tiempo real
                    if (filterAssignedTo) {
                        // Preservar la selección actual del filtro
                        const previousValue = filterAssignedTo.value;

                        // Actualizar el filtro con los nuevos usuarios disponibles
                        const visibleUsers = ALL_USERS_CACHE.filter(u =>
                            u.username === CURRENT_USER ||
                            (CURRENT_USER_ROLE === 'Administrador' || 
                             (ALL_USERS_CACHE.find(cu => cu.username === CURRENT_USER)?.supervisedUsers || []).includes(u.username))
                        );

                        const userOptionsHtml = visibleUsers
                            .map(user => `<option value="${escapeHtml(user.username)}">${escapeHtml(user.username)}</option>`)
                            .join('');

                        filterAssignedTo.innerHTML = `
                            <option value="">Todos</option>
                            ${userOptionsHtml}
                        `;

                        // Intentar restaurar SIEMPRE la selección anterior (incluye "Todos")
                        filterAssignedTo.value = previousValue;
                        // Si el valor previo ya no existe, caer a "Todos"
                        if (filterAssignedTo.value !== previousValue) {
                            filterAssignedTo.value = '';
                        }
                    }
                } else if (currentScreen === 'user-management') {
                    // Actualizar la tabla de usuarios
                    await loadUsers();
                }
                
                // Mostrar notificación sutil
                showToast('Configuración actualizada', 'info');
            }
        } catch (error) {
            console.error('Error al verificar cambios de configuración:', error);
        }
    }
    
    // Función para iniciar el monitoreo de cambios
    function startConfigMonitoring() {
        if (configUpdateInterval) {
            clearInterval(configUpdateInterval);
        }
        
        // Verificar cambios cada 5 segundos
        configUpdateInterval = setInterval(checkConfigChanges, 5000);
        
        // También verificar al hacer acciones específicas
        console.log('🔍 Monitoreo de cambios de configuración iniciado');
        
        // 🔄 NUEVO: Iniciar también el monitoreo del estado online
        startOnlineStatusMonitoring();
    }
    
    // Función para detener el monitoreo
    function stopConfigMonitoring() {
        if (configUpdateInterval) {
            clearInterval(configUpdateInterval);
            configUpdateInterval = null;
        }
        console.log('🔍 Monitoreo de cambios de configuración detenido');
        
        // 🔄 NUEVO: Detener también el monitoreo del estado online
        stopOnlineStatusMonitoring();
    }
    
    // Función para verificar cambios manualmente (llamada antes de abrir combos)
    async function refreshConfigIfNeeded() {
        await checkConfigChanges();
    }
    
    // 🔄 NUEVO: Sistema de chat en tiempo real
    let chatUpdateInterval = null;
    let lastChatHash = null;
    
    // Función para generar un hash del chat de una tarea
    function generateChatHash(taskId) {
        const task = loadTaskObj(taskId);
        if (!task || !task.chat) return null;
        
        const chatString = task.chat.map(msg => 
            `${msg.type}:${msg.user || ''}:${msg.message}:${msg.date}`
        ).join('|');
        
        let hash = 0;
        for (let i = 0; i < chatString.length; i++) {
            const char = chatString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    // Función para verificar cambios en el chat de la tarea abierta
    async function checkChatChanges() {
        if (!OPEN_TASK_ID) return;
        
        try {
            // Recargar la tarea desde el archivo para obtener cambios
            const allTasks = await window.api.readTasks();
            const updatedTask = allTasks.find(t => t.id === OPEN_TASK_ID);
            
            if (!updatedTask) return;
            
            const currentChatHash = generateChatHash(OPEN_TASK_ID);
            
            // Si es la primera vez, solo guardar el hash
            if (lastChatHash === null) {
                lastChatHash = currentChatHash;
                return;
            }
            
            // Si hay cambios en el chat
            if (currentChatHash !== lastChatHash) {
                console.log('💬 Cambios detectados en el chat de la tarea');
                
                // Actualizar el caché local
                const localTask = loadTaskObj(OPEN_TASK_ID);
                if (localTask) {
                    localTask.chat = updatedTask.chat;
                    localTask.notifications = updatedTask.notifications;
        
                    
                    // Actualizar la interfaz
                    renderChat(localTask.chat || []);
                    

                    
                    // Actualizar el indicador de notificaciones
                    updateNotificationsIndicator();
                    
                    // 🔄 NUEVO: Actualizar también las notificaciones de la pantalla de gestión de usuarios
                    updateNotificationsIndicatorUserManagement();
                }
                
                lastChatHash = currentChatHash;
            }
        } catch (error) {
            console.error('Error al verificar cambios en el chat:', error);
        }
    }
    
    // Función para iniciar el monitoreo del chat
    function startChatMonitoring() {
        if (chatUpdateInterval) {
            clearInterval(chatUpdateInterval);
        }
        
        // Verificar cambios en el chat cada 2 segundos para mayor responsividad
        chatUpdateInterval = setInterval(checkChatChanges, 2000);
        console.log('💬 Monitoreo de chat en tiempo real iniciado');
    }
    
    // Función para detener el monitoreo del chat
    function stopChatMonitoring() {
        if (chatUpdateInterval) {
            clearInterval(chatUpdateInterval);
            chatUpdateInterval = null;
        }
        console.log('💬 Monitoreo de chat en tiempo real detenido');
    }
    
    // Función para resetear el hash del chat (cuando se abre una nueva tarea)
    function resetChatHash() {
        lastChatHash = null;
    }

    // Sistema de notificaciones
    function hasUnreadNotifications(task, currentUser) {
        if (!task.notifications || !task.chat) return false;
        
        const userNotifications = task.notifications[currentUser] || 0;
        const totalMessages = task.chat.length;
        
        // Si no hay mensajes nuevos, no hay notificaciones
        if (totalMessages <= userNotifications) return false;
        
        // Verificar si los mensajes "nuevos" son del usuario actual
        // Solo contar como no leídos los mensajes que NO son del usuario actual
        let actualUnreadCount = 0;
        for (let i = userNotifications; i < totalMessages; i++) {
            const message = task.chat[i];
            if (message.type === 'system') {
                // Para mensajes del sistema, verificar si el usuario actual los creó
                const isCurrentUserMessage = message.message && message.message.includes(`[${currentUser}]`);
                if (!isCurrentUserMessage) {
                    actualUnreadCount++;
                }
            } else if (message.type === 'user') {
                // Para mensajes de usuario, solo contar si no es del usuario actual
                if (message.user !== currentUser) {
                    actualUnreadCount++;
                }
            }
        }
        
        return actualUnreadCount > 0;
    }

    function getUnreadCount(task, currentUser) {
        if (!task.notifications || !task.chat) return 0;
        
        const userNotifications = task.notifications[currentUser] || 0;
        const totalMessages = task.chat.length;
        
        // Si no hay mensajes nuevos, no hay notificaciones
        if (totalMessages <= userNotifications) return 0;
        
        // Contar solo los mensajes "nuevos" que NO son del usuario actual
        let actualUnreadCount = 0;
        for (let i = userNotifications; i < totalMessages; i++) {
            const message = task.chat[i];
            if (message.type === 'system') {
                // Para mensajes del sistema, verificar si el usuario actual los creó
                const isCurrentUserMessage = message.message && message.message.includes(`[${currentUser}]`);
                if (!isCurrentUserMessage) {
                    actualUnreadCount++;
                }
            } else if (message.type === 'user') {
                // Para mensajes de usuario, solo contar si no es del usuario actual
                if (message.user !== currentUser) {
                    actualUnreadCount++;
                }
            }
        }
        
        return actualUnreadCount;
    }

    function markTaskAsRead(taskId, currentUser) {
        const task = loadTaskObj(taskId);
        if (!task) return;
        
        if (!task.notifications) {
            task.notifications = {};
        }
        
        // Marcar como leídos todos los mensajes actuales
        // Esto incluye los mensajes que el usuario acaba de crear
        task.notifications[currentUser] = task.chat ? task.chat.length : 0;
        saveTaskObj(task, false);
    }

    function addNotificationToTask(taskId, currentUser, message) {
        const task = loadTaskObj(taskId);
        if (!task) return;
        
        if (!task.notifications) {
            task.notifications = {};
        }
        
        // Marcar que el usuario actual ya ha visto este mensaje
        task.notifications[currentUser] = (task.notifications[currentUser] || 0) + 1;
        
        // Para otros usuarios, no incrementar el contador (se marcará como no leído)
        saveTaskObj(task, false);
    }

    function notifyAllUsersExcept(taskId, exceptUser, message) {
        const task = loadTaskObj(taskId);
        if (!task) return;
        
        if (!task.notifications) {
            task.notifications = {};
        }
        
        // NO agregar mensajes automáticos al chat del historial
        // Solo actualizar el contador de notificaciones para otros usuarios
        // (se marcará como no leído hasta que abran la tarea)
        // Esta función ahora solo se usa para cambios de tarea, no para mensajes del chat
        
        // El mensaje ya está en el chat (se agregó en la función que llama a esta)
        // Solo necesitamos que se marque como no leído para otros usuarios
        saveTaskObj(task, true);
    }

    function updateNotificationsIndicator() {
        if (!notificationsIndicator || !totalNotificationsCount) return;
        
        // Para el contador de notificaciones, usar TODAS las tareas que el usuario puede ver
        // sin aplicar filtros de búsqueda, para mostrar el número real de tareas con cambios
        const all = ALL_TASKS_CACHE;
        
        let visibleTasks = all.filter(t => {
            // Filtro de privacidad: Si la tarea es privada y no la creamos nosotros, la ocultamos.
            if (t.private && t.createdBy !== CURRENT_USER) {
                return false;
            }
            return true;
        });

        // 🔒 Restricción de visibilidad para usuarios estándar
        if (CURRENT_USER_ROLE !== 'Administrador') {
            const currentUserData = ALL_USERS_CACHE.find(u => u.username === CURRENT_USER) || {};
            const supervised = currentUserData.supervisedUsers || [];
            visibleTasks = visibleTasks.filter(t =>
                // El creador de una tarea SIEMPRE puede ver esa tarea
                t.createdBy === CURRENT_USER ||
                // O si está asignada al usuario actual
                t.assignedTo === CURRENT_USER ||
                // O si tiene visibilidad sobre el creador de la tarea
                supervised.includes(t.createdBy) ||
                // O si tiene visibilidad sobre el usuario asignado a la tarea
                supervised.includes(t.assignedTo)
            );
        }
        
        // Contar tareas con modificaciones en lugar de mensajes totales
        let tasksWithModifications = 0;
        
        visibleTasks.forEach(task => {
            if (hasUnreadNotifications(task, CURRENT_USER)) {
                tasksWithModifications++;
            }
        });
        
        if (tasksWithModifications > 0) {
            totalNotificationsCount.textContent = tasksWithModifications;
            notificationsIndicator.classList.remove('hidden');
        } else {
            notificationsIndicator.classList.add('hidden');
        }
    }

    // Función para actualizar notificaciones en la pantalla de gestión de usuarios
    function updateNotificationsIndicatorUserManagement() {
        if (!notificationsIndicatorUserManagement || !totalNotificationsCountUserManagement) return;
        
        // Para el contador de notificaciones, usar TODAS las tareas que el usuario puede ver
        // sin aplicar filtros de búsqueda, para mostrar el número real de tareas con cambios
        const all = ALL_TASKS_CACHE;
        
        let visibleTasks = all.filter(t => {
            // Filtro de privacidad: Si la tarea es privada y no la creamos nosotros, la ocultamos.
            if (t.private && t.createdBy !== CURRENT_USER) {
                return false;
            }
            return true;
        });
        
        // 🔒 Restricción de visibilidad para usuarios estándar
        if (CURRENT_USER_ROLE !== 'Administrador') {
            const currentUserData = ALL_USERS_CACHE.find(u => u.username === CURRENT_USER) || {};
            const supervised = currentUserData.supervisedUsers || [];
            visibleTasks = visibleTasks.filter(t =>
                // El creador de una tarea SIEMPRE puede ver esa tarea
                t.createdBy === CURRENT_USER ||
                // O si está asignada al usuario actual
                t.assignedTo === CURRENT_USER ||
                // O si tiene visibilidad sobre el creador de la tarea
                supervised.includes(t.createdBy) ||
                // O si tiene visibilidad sobre el usuario asignado a la tarea
                supervised.includes(t.assignedTo)
            );
        }
        
        // Contar tareas con modificaciones en lugar de mensajes totales
        let tasksWithModifications = 0;
        
        visibleTasks.forEach(task => {
            if (hasUnreadNotifications(task, CURRENT_USER)) {
                tasksWithModifications++;
            }
        });
        
        if (tasksWithModifications > 0) {
            totalNotificationsCountUserManagement.textContent = tasksWithModifications;
            notificationsIndicatorUserManagement.classList.remove('hidden');
        } else {
            notificationsIndicatorUserManagement.classList.add('hidden');
        }
    }

    // Función para cargar todas las tareas desde el archivo
    async function loadAllTasks() {
        ALL_TASKS_CACHE = await window.api.readTasks();
        
        // Inicializar notificaciones para tareas existentes que no las tengan
        let hasChanges = false;
        ALL_TASKS_CACHE.forEach(task => {
            if (!task.notifications) {
                task.notifications = {};
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            await saveAllTasks(ALL_TASKS_CACHE);
        }
        
        return ALL_TASKS_CACHE;
    }

    // Función para guardar todas las tareas en el archivo
    async function saveAllTasks(tasksToSave) {
        const result = await window.api.writeTasks(tasksToSave);
        if (result.success) {
            ALL_TASKS_CACHE = tasksToSave;
        } else {
            console.error("Error saving tasks:", result.error);
            showToast('Error al guardar tareas', 'error'); // Actualizado para usar tipo 'error'
        }
        return result.success;
    }

    // Función para cargar los usuarios
    async function loadAllUsers() {
        ALL_USERS_CACHE = await window.api.readUsers();
        return ALL_USERS_CACHE;
    }

    // Las funciones de tarea individuales ahora operarán sobre la caché y luego guardarán
    async function saveTaskObj(task, updateModifiedTime = true) {
        const tasks = ALL_TASKS_CACHE;
        const existingIndex = tasks.findIndex(t => t.id === task.id);
        if (existingIndex > -1) {
            tasks[existingIndex] = { ...tasks[existingIndex], ...task };
            if (updateModifiedTime) {
                tasks[existingIndex].lastModified = new Date().toISOString();
            }
        } else {
            if (updateModifiedTime) {
                task.lastModified = new Date().toISOString();
            }
            tasks.push(task);
        }
        await saveAllTasks(tasks);
    }

    async function removeTaskObj(id) {
        const tasks = ALL_TASKS_CACHE.filter(t => t.id !== id);
        await saveAllTasks(tasks);
    }

    function loadTaskObj(id) {
        return ALL_TASKS_CACHE.find(t => t.id === id) || null;
    }

    function genId() { return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }


    // App state
    let CURRENT_USER = null;
    let CURRENT_USER_ROLE = null;
    let OPEN_TASK_ID = null;

    // Referencias a elementos HTML de la pantalla de gestión de usuarios
    const screenUserManagement = document.getElementById('screen-user-management');
    const btnUserManagement = document.getElementById('btn-user-management');
    const btnBackToMain = document.getElementById('btn-back-to-main-from-user-list'); // Nuevo ID para el botón de volver
    const usersTableBody = document.getElementById('users-table-body');
    
    // Referencias para la barra superior de gestión de usuarios
    const currentUserUserManagement = document.getElementById('current-user-user-management');
    const notificationsIndicatorUserManagement = document.getElementById('notifications-indicator-user-management');
    const totalNotificationsCountUserManagement = document.getElementById('total-notifications-count-user-management');

    const filterUserName = document.getElementById('filter-user-name');
    const filterUserRole = document.getElementById('filter-user-role');
    const btnClearUserFilters = document.getElementById('btn-clear-user-filters');

    // Elementos del formulario de AÑADIR nuevo usuario (sección fija)
    const userManagementUsernameAdd = document.getElementById('user-management-username-add');
    const userManagementPasswordAdd = document.getElementById('user-management-password-add');
    const userManagementRoleAdd = document.getElementById('user-management-role-add');
    const btnAddUser = document.getElementById('btn-add-user');

    // Referencias a elementos del NUEVO MODAL DE EDICIÓN DE USUARIOS
    const editUserModal = document.getElementById('edit-user-modal');
    const editUserModalTitle = document.getElementById('edit-user-modal-title');
    const editUserUsername = document.getElementById('edit-user-username');
    const editUserPassword = document.getElementById('edit-user-password');
    const editUserRole = document.getElementById('edit-user-role');
    const editUserSupervisingCheckboxes = document.getElementById('edit-user-supervising-checkboxes');
    const btnSaveEditedUser = document.getElementById('btn-save-edited-user');
    const btnCancelEditUser = document.getElementById('btn-cancel-edit-user');

    // Nuevas referencias para el modal de edición mejorado
    const availableUsersList = document.getElementById('available-users-list');
    const supervisedUsersList = document.getElementById('supervised-users-list');
    const filterAvailableUsers = document.getElementById('filter-available-users');
    const filterSupervisedUsers = document.getElementById('filter-supervised-users');
    // Los botones >> y << han sido eliminados, ahora solo se usa doble clic

    // Referencias para el modal de éxito
    const userCreatedSuccessModal = document.getElementById('user-created-success-modal');
    const btnCloseSuccessModal = document.getElementById('btn-close-success-modal');

    // Referencias para el modal de cambiar contraseña
    const changePasswordModal = document.getElementById('change-password-modal');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const btnSaveNewPassword = document.getElementById('btn-save-new-password');
    const btnCancelChangePassword = document.getElementById('btn-cancel-change-password');
    const newPasswordHelp = document.getElementById('new-password-help');
    const confirmPasswordHelp = document.getElementById('confirm-password-help');

    // Referencias para el modal de crear nuevo usuario
    const newUserModal = document.getElementById('new-user-modal');
    const newUserUsername = document.getElementById('new-user-username');
    const newUserPassword = document.getElementById('new-user-password');
    const newUserConfirmPassword = document.getElementById('new-user-confirm-password');
    const btnSaveNewUser = document.getElementById('btn-save-new-user');
    const btnCancelNewUser = document.getElementById('btn-cancel-new-user');
    const newUserPasswordHelp = document.getElementById('new-user-password-help');
    const newUserConfirmPasswordHelp = document.getElementById('new-user-confirm-password-help');
    const newUserLink = document.getElementById('new-user-link');

    let editingUsername = null; // Variable para almacenar el nombre del usuario que se está editando


    // Elements
    const screenLogin = document.getElementById('screen-login'); // Nuevo
    const loginUsername = document.getElementById('login-username'); // Nuevo
    const loginPassword = document.getElementById('login-password'); // Nuevo
    const btnLogin = document.getElementById('btn-login'); // Nuevo
    const loginErrorMessage = document.getElementById('login-error-message'); // Nuevo

    const screenMain = document.getElementById('screen-main');
    const currentUserEl = document.getElementById('current-user');
    const btnLogoutMain = document.getElementById('btn-logout');

    const newTitle = document.getElementById('new-title');
    const newDesc = document.getElementById('new-desc');
    const newPriority = document.getElementById('new-priority');
    const btnCreate = document.getElementById('btn-create');

    const filterText = document.getElementById('filter-text');
    const filterState = document.getElementById('filter-state');
    const filterPriority = document.getElementById('filter-priority');
    const btnResetFilters = document.getElementById('btn-reset-filters');

    const tasksGrid = document.getElementById('tasks-grid');
    const tasksTable = document.getElementById('tasks-table');
    const tasksTableBody = document.getElementById('tasks-table-body');
    const btnToggleView = document.getElementById('btn-toggle-view');
    const iconTable = document.getElementById('icon-table');
    const iconCards = document.getElementById('icon-cards');
    const viewModeText = document.getElementById('view-mode-text');
    // Estado de ordenación de la tabla de tareas
    let tableSort = { key: 'lastModified', direction: 'desc' }; // direction: 'asc' | 'desc'

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const editTitle = document.getElementById('edit-title');
    const editDesc = document.getElementById('edit-desc');
    const editPriority = document.getElementById('edit-priority');
    const editState = document.getElementById('edit-state');
    const stateCommentBox = document.getElementById('state-comment-box');
    const stateComment = document.getElementById('state-comment');
    const btnSave = document.getElementById('btn-save');
    const closeModal = document.getElementById('close-modal');
    const readonlyNote = document.getElementById('readonly-note');
    const badgeOcupado = document.getElementById('badge-ocupado');

    const chatBox = document.getElementById('chat-box');
    const chatUser = document.getElementById('chat-user');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    const toast = document.getElementById('toast');
    
    // Elementos del indicador de notificaciones
    const notificationsIndicator = document.getElementById('notifications-indicator');
    const totalNotificationsCount = document.getElementById('total-notifications-count');

    // Modificado: Se añade un elemento para el mensaje dinámico del modal de confirmación.
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    // --- NUEVAS REFERENCIAS PARA EL MODAL DE ERROR ---
    const deleteConfirmModalTitle = document.getElementById('delete-confirm-modal-title');
    const deleteConfirmModalMessage = document.getElementById('delete-confirm-modal-message');
    const deleteConfirmModalActions = document.getElementById('delete-confirm-modal-actions');
    const btnCloseErrorModal = document.getElementById('btn-close-error-modal');
    // --- NUEVAS REFERENCIAS PARA CONFIRMACIÓN DE TEXTO ---
    const deleteConfirmTextInput = document.getElementById('delete-confirm-text-input');
    const confirmDeleteText = document.getElementById('confirm-delete-text');
    // --- FIN NUEVAS REFERENCIAS ---

    const deleteConfirmMessage = deleteConfirmModal ? deleteConfirmModal.querySelector('p') : null; // Selector para el párrafo del mensaje
    const btnDeleteConfirm = document.getElementById('btn-delete-confirm');
    const btnDeleteCancel = document.getElementById('btn-delete-cancel');
    let TASK_TO_DELETE_ID = null;
    // Nuevo: Variable para almacenar el nombre de usuario a eliminar
    let USER_TO_DELETE_USERNAME = null;

    // Nuevos elementos para crear tarea
    const newAssignedTo = document.getElementById('new-assigned-to');
    const newPrivate = document.getElementById('new-private');

    // Control de disponibilidad del checkbox de privacidad en creación
    function updateNewPrivateAvailability() {
        if (!newPrivate) return;
        const selectedAssignee = newAssignedTo && newAssignedTo.value
            ? normalizeUsername(newAssignedTo.value)
            : CURRENT_USER;
        const isSelf = !!CURRENT_USER && !!selectedAssignee && selectedAssignee.toLowerCase() === CURRENT_USER.toLowerCase();
        const newPrivateLabel = document.querySelector('label[for="new-private"]');
        if (isSelf) {
            newPrivate.disabled = false;
            if (newPrivateLabel) newPrivateLabel.classList.remove('opacity-50', 'text-slate-400', 'cursor-not-allowed');
        } else {
            newPrivate.checked = false;
            newPrivate.disabled = true;
            if (newPrivateLabel) newPrivateLabel.classList.add('opacity-50', 'text-slate-400', 'cursor-not-allowed');
        }
    }

    // Nuevos elementos para filtros
    const filterAssignedTo = document.getElementById('filter-assigned-to');
    const filterVisibleBy = document.getElementById('filter-visible-by');

    // Nuevos elementos para editar tarea
    const editAssignedTo = document.getElementById('edit-assigned-to');
    const editPrivate = document.getElementById('edit-private');

    // Control dinámico de privacidad en edición de tarea
    function updateEditPrivateAvailability() {
        if (!editPrivate) return;
        const task = OPEN_TASK_ID ? loadTaskObj(OPEN_TASK_ID) : null;
        if (!task) return;
        const selectedAssignee = editAssignedTo && editAssignedTo.value
            ? normalizeUsername(editAssignedTo.value)
            : (task.assignedTo || task.createdBy);
        const isAssignedToSelf = !!CURRENT_USER && !!selectedAssignee && selectedAssignee.toLowerCase() === CURRENT_USER.toLowerCase();
        const canMakePrivate = task.createdBy === CURRENT_USER && isAssignedToSelf;

        editPrivate.disabled = !canMakePrivate;
        if (!canMakePrivate) {
            editPrivate.checked = false;
        }

        // Mensaje de ayuda
        const editPrivateHelp = document.getElementById('edit-private-help');
        if (editPrivateHelp) {
            if (canMakePrivate) editPrivateHelp.classList.add('hidden');
            else editPrivateHelp.classList.remove('hidden');
        }
    }

    // Elementos del modal de información del usuario
    const userInfoModal = document.getElementById('user-info-modal');
    const btnCloseUserInfoModal = document.getElementById('btn-close-user-info-modal');
    const usersIHaveVisibility = document.getElementById('users-i-have-visibility');
    const usersWhoHaveVisibilityOverMe = document.getElementById('users-who-have-visibility-over-me');
    
    // Elementos del menú hamburguesa
    const hamburgerButton = document.getElementById('hamburger-button');
    const hamburgerDropdown = document.getElementById('hamburger-dropdown');
    const btnHelp = document.getElementById('btn-help');
    
    // Elementos del modal de ayuda
    const helpModal = document.getElementById('help-modal');
    const helpContent = document.getElementById('help-content');
    const btnCloseHelpModal = document.getElementById('btn-close-help-modal');

    // Small helpers
    // --- showToast MODIFICADO PARA SOPORTAR TIPOS ---
    function showToast(message, type = 'info') {
        if (!toast) {
            console.warn("Elemento 'toast' no encontrado. No se puede mostrar el toast.");
            return;
        }
        toast.textContent = message;
        toast.classList.remove('hidden', 'opacity-0', 'bg-emerald-600', 'bg-rose-600', 'bg-slate-800'); // Limpia clases anteriores
        toast.classList.add('opacity-100');

        // Aplica clases de color según el tipo de mensaje
        if (type === 'error') {
            toast.classList.add('bg-rose-600');
        } else if (type === 'success') {
            toast.classList.add('bg-emerald-600');
        } else {
            toast.classList.add('bg-slate-800'); // Color por defecto (info)
        }

        // Oculta el toast después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
            // Asegura que el toast esté completamente oculto después de la transición
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300); // Coincide con la duración de la transición CSS
        }, 3000); // Mostrar durante 3 segundos
    }
    // --- FIN showToast MODIFICADO ---

    function escapeHtml(s = '') { return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
    function truncate(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    function priorityBadge(priority) { const base = 'text-xs font-semibold px-2 py-1 rounded-full'; switch (priority) { case 'Urgente': return `<span class="${base} bg-rose-600 text-white">${priority}</span>`; case 'Alta': return `<span class="${base} bg-amber-500 text-black">${priority}</span>`; case 'Media': return `<span class="${base} bg-sky-500 text-black">${priority}</span>`; case 'Baja': return `<span class="${base} bg-slate-600 text-white">${priority}</span>`; default: return `<span class="${base} bg-slate-600">${priority}</span>`; } }
    function stateBadge(state) { const base = 'text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap'; switch (state) { case 'Sin iniciar': return `<span class="${base} bg-slate-700">${state}</span>`; case 'En progreso': return `<span class="${base} bg-indigo-600">${state}</span>`; case 'En espera': return `<span class="${base} bg-amber-600">${state}</span>`; case 'Finalizada': return `<span class="${base} bg-emerald-600">${state}</span>`; default: return `<span class="${base} bg-slate-700">${state}</span>`; } }
    function privacyBadge(isPrivate) { 
        const base = 'text-xs font-semibold px-2 py-1 rounded-full'; 
        if (isPrivate) {
            return `<span class="${base} bg-rose-600 text-white">🔒 Privada</span>`;
        } else {
            return `<span class="${base} bg-emerald-600 text-white">🌐 Pública</span>`;
        }
    }

    // Función para normalizar nombres de usuario (primera letra mayúscula, resto minúsculas)
    function normalizeUsername(username) {
        if (!username) return '';
        return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    }

    /**
     * Muestra un modal de mensaje de error reutilizando el modal de confirmación de eliminación.
     * @param {string} title El título del modal.
     * @param {string} message El mensaje de error a mostrar.
     */
    function showErrorMessageModal(title, message) {
        if (deleteConfirmModal && deleteConfirmModalTitle && deleteConfirmModalMessage && deleteConfirmModalActions && btnCloseErrorModal) {
            deleteConfirmModalTitle.textContent = title;
            deleteConfirmModalMessage.textContent = message;
            deleteConfirmModalActions.classList.add('hidden'); // Oculta los botones de "Sí, Eliminar" y "Cancelar"
            btnCloseErrorModal.classList.remove('hidden'); // Muestra el botón "Entendido"

            deleteConfirmModal.classList.remove('hidden'); // Muestra el modal
            deleteConfirmModal.classList.add('flex'); // Asegura que se centre correctamente con flexbox
        } else {
            // Fallback y mensaje de depuración si los elementos del modal no se encuentran
            console.error("Error: Algunos elementos del modal de confirmación no se encontraron. Mostrando un toast en su lugar.");
            showToast(message, 'error'); // Usar toast como alternativa si el modal no está configurado
        }
    }

    // Event listener para cerrar el modal de error (botón "Entendido")
    if (btnCloseErrorModal) {
        btnCloseErrorModal.addEventListener('click', () => {
            if (deleteConfirmModal) {
                deleteConfirmModal.classList.add('hidden');
                deleteConfirmModal.classList.remove('flex');
                // Restaura el estado original del modal de confirmación para futuras eliminaciones
                if (deleteConfirmModalActions) deleteConfirmModalActions.classList.remove('hidden');
                if (btnCloseErrorModal) btnCloseErrorModal.classList.add('hidden');
            }
        });
    }

    /**
     * Carga los usuarios disponibles en los campos de selección "Asignado a".
     * Se llamará al iniciar la aplicación y después de cada login/logout si es necesario.
     */
    async function populateAssignedUsers() {
        // 🔄 NUEVO: Verificar cambios de configuración antes de cargar usuarios
        await refreshConfigIfNeeded();
        
        const users = await loadAllUsers(); // Carga todos los usuarios
        let visibleUsers;

        if (CURRENT_USER_ROLE === 'Administrador') {
            // Admin ve todos los usuarios
            visibleUsers = users;
        } else {
            // Usuario estándar: solo él mismo y usuarios con visibilidad
            const currentUserData = users.find(u => u.username === CURRENT_USER) || {};
            visibleUsers = users.filter(u =>
                u.username === CURRENT_USER ||
                (currentUserData.supervisedUsers || []).includes(u.username)
            );
        }

        // Filtrar el usuario actual para evitar duplicación en las opciones
        const otherUsers = visibleUsers.filter(user => user.username !== CURRENT_USER);
        const userOptionsHtml = otherUsers
            .map(user => `<option value="${escapeHtml(user.username)}">${escapeHtml(user.username)}</option>`)
            .join('');

        // Crear tarea - siempre incluir opción para asignar al usuario actual
        if (newAssignedTo) {
            newAssignedTo.innerHTML = `
                <option value="${escapeHtml(CURRENT_USER)}">Asignar a mí (${escapeHtml(CURRENT_USER)})</option>
                ${userOptionsHtml}
            `;
        }

        // Editar tarea - siempre incluir opción para asignar al usuario actual
        if (editAssignedTo) {
            editAssignedTo.innerHTML = `
                <option value="${escapeHtml(CURRENT_USER)}">Asignar a mí (${escapeHtml(CURRENT_USER)})</option>
                ${userOptionsHtml}
            `;
        }

        // Filtro de tareas
        if (filterAssignedTo) {
            // Preservar la selección previa si ya fue inicializado; si no, usar el usuario actual
            const previousValue = filterAssignedTo.dataset.initialized ? filterAssignedTo.value : CURRENT_USER;
            filterAssignedTo.innerHTML = `
                <option value="">Todos</option>
                <option value="${escapeHtml(CURRENT_USER)}">${escapeHtml(CURRENT_USER)}</option>
                ${userOptionsHtml}
            `;
            filterAssignedTo.value = previousValue;
            filterAssignedTo.dataset.initialized = 'true';
        }
    } // <-- El cierre de la función populateAssignedUsers debe ir aquí y solo una vez.


    // Función para alternar entre vista de tarjetas y tabla
    async function toggleViewMode() {
        if (currentViewMode === 'cards') {
            // Cambiar a vista de tabla
            currentViewMode = 'table';
            tasksGrid.classList.add('hidden');
            tasksTable.classList.remove('hidden');
            iconTable.classList.remove('hidden');
            iconCards.classList.add('hidden');
            viewModeText.textContent = 'Vista de Tarjetas';
            initTableSorting();
            renderTasksTable();
        } else {
            // Cambiar a vista de tarjetas
            currentViewMode = 'cards';
            tasksTable.classList.add('hidden');
            tasksGrid.classList.remove('hidden');
            iconCards.classList.remove('hidden');
            iconTable.classList.add('hidden');
            viewModeText.textContent = 'Vista de Tabla';
            renderTasksCards();
        }
        
        // 🔄 NUEVO: Guardar preferencia del usuario
        await saveUserPreferences();
    }

    // Inicializar eventos de ordenación en cabeceras de la tabla
    function initTableSorting() {
        if (!tasksTable) return;
        const thead = tasksTable.querySelector('thead');
        if (!thead) return;
        const headers = Array.from(thead.querySelectorAll('th'));
        const headerKeyByIndex = {
            0: 'title',
            1: 'createdBy',
            2: 'assignedTo',
            3: 'priority',
            4: 'state',
            5: 'private',
            6: 'lastModified'
            // 7: Acciones (sin orden)
        };

        headers.forEach((th, idx) => {
            const key = headerKeyByIndex[idx];
            // Saltar si no hay key (Acciones)
            if (!key) return;
            th.style.cursor = 'pointer';
            th.setAttribute('title', 'Ordenar');
            th.addEventListener('click', () => {
                if (tableSort.key === key) {
                    tableSort.direction = tableSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    tableSort.key = key;
                    tableSort.direction = 'asc';
                }
                updateTableHeaderSortIndicators(headers, headerKeyByIndex);
                renderTasksTable();
            });
        });

        // Mostrar indicadores iniciales
        updateTableHeaderSortIndicators(headers, headerKeyByIndex);
    }

    function updateTableHeaderSortIndicators(headers, headerKeyByIndex) {
        headers.forEach((th, idx) => {
            const key = headerKeyByIndex[idx];
            // Limpiar indicador previo
            const baseText = (th.getAttribute('data-base-text') || th.textContent).trim();
            th.setAttribute('data-base-text', baseText);
            if (!key) {
                th.textContent = baseText; // Acciones sin indicador
                return;
            }
            if (tableSort.key === key) {
                const arrow = tableSort.direction === 'asc' ? '▲' : '▼';
                th.textContent = `${baseText} ${arrow}`;
            } else {
                th.textContent = baseText;
            }
        });
    }

    // Función para renderizar tareas en vista de tarjetas
    async function renderTasksCards() {
        const all = await loadAllTasks();
        const q = (filterText && filterText.value || '').trim().toLowerCase();
        const st = (filterState && filterState.value) || '';
        const pr = (filterPriority && filterPriority.value) || '';
        const assignedFilter = (filterAssignedTo && filterAssignedTo.value) || '';
        const visibleByFilter = (filterVisibleBy && filterVisibleBy.value) || '';

        let items = all.filter(t => {
            // Filtro de privacidad: Si la tarea es privada y no la creamos nosotros, la ocultamos.
            if (t.private && t.createdBy !== CURRENT_USER) {
                return false;
            }

            // Aplicar filtro de estado
            if (st) {
                if (st === 'OPEN_TASKS') {
                    // Tareas abiertas: todas excepto "Finalizada"
                    if (t.state === 'Finalizada') return false;
                } else if (t.state !== st) {
                    return false;
                }
            }
            
            if (pr && t.priority !== pr) return false;

            // Aplicar filtro de asignado a
            if (assignedFilter) {
                if (assignedFilter === 'CURRENT_USER') {
                    if (t.assignedTo !== CURRENT_USER) return false;
                } else {
                    if (t.assignedTo.toLowerCase() !== assignedFilter.toLowerCase()) return false;
                }
            }

            // Aplicar filtro de visibilidad por usuario
            if (visibleByFilter) {
                const usersWhoSupervise = ALL_USERS_CACHE.filter(user =>
                    user.role !== 'Administrador' &&
                    (user.supervisedUsers || []).includes(visibleByFilter)
                ).map(user => user.username);

                usersWhoSupervise.push(visibleByFilter);

                items = items.filter(t =>
                    usersWhoSupervise.includes(t.createdBy) ||
                    usersWhoSupervise.includes(t.assignedTo)
                );
            }

            if (!q) return true;
            return (t.title || '').toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q);
        });

        // 🔒 Restricción de visibilidad para usuarios estándar
        if (CURRENT_USER_ROLE !== 'Administrador') {
            const currentUserData = ALL_USERS_CACHE.find(u => u.username === CURRENT_USER) || {};
            const supervised = currentUserData.supervisedUsers || [];
            items = items.filter(t =>
                t.createdBy === CURRENT_USER ||
                t.assignedTo === CURRENT_USER ||
                supervised.includes(t.createdBy) ||
                supervised.includes(t.assignedTo)
            );
        }

        const priorityOrder = { 'Urgente': 3, 'Alta': 2, 'Media': 1, 'Baja': 0 };
        items.sort((a, b) => { 
            const pa = priorityOrder[a.priority] ?? 0; 
            const pb = priorityOrder[b.priority] ?? 0; 
            if (pa !== pb) return pb - pa; 
            return new Date(b.lastModified) - new Date(a.lastModified); 
        });

        if (!tasksGrid) return;
        tasksGrid.innerHTML = items.map(t => {
            const assignedToText = t.assignedTo 
                ? `Asignado a: <span class="font-medium text-indigo-300">${escapeHtml(t.assignedTo)}</span>`
                : `Asignado a: <span class="font-medium text-amber-300">${escapeHtml(t.createdBy)}</span> (creador)`;
            return `
                <div class="p-4 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 shadow">
                    <div class="task-card-content cursor-pointer hover:scale-[1.01] transform transition-transform duration-200 p-1" data-id="${t.id}">
                        <div class="mb-2">
                            <h4 class="font-semibold text-lg leading-tight">${escapeHtml(t.title)}</h4>
                        </div>
                        <div class="flex justify-between items-center gap-2 mb-2">
                            <div>${stateBadge(t.state)}</div>
                            <div>${priorityBadge(t.priority)}</div>
                        </div>
                        <div class="flex justify-between items-center gap-2 mb-2">
                            <div class="text-xs text-slate-400">${assignedToText}</div>
                            <div>${privacyBadge(t.private || false)}</div>
                        </div>
                        <div class="text-xs text-slate-400">${new Date(t.lastModified).toLocaleString()}</div>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <div class="flex items-center gap-2">
                            ${hasUnreadNotifications(t, CURRENT_USER) ? `
                                <div class="flex items-center gap-1 text-amber-400" title="Tienes ${getUnreadCount(t, CURRENT_USER)} notificación(es) sin leer">
                                    <div class="flex items-center justify-center w-4 h-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/>
                                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                                        </svg>
                                    </div>
                                    <span class="text-xs font-semibold">${getUnreadCount(t, CURRENT_USER)}</span>
                                </div>
                            ` : ''}
                        </div>
                        <button class="btn-delete-task text-rose-300 hover:text-rose-500 transition" data-id="${t.id}" title="Eliminar tarea">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                </div>`;
        }).join('');

        // Adjuntar event listeners DESPUÉS de renderizar el HTML
        Array.from(tasksGrid.querySelectorAll('.task-card-content')).forEach(el => {
            el.addEventListener('click', () => openTask(el.getAttribute('data-id')));
        });

        Array.from(tasksGrid.querySelectorAll('.btn-delete-task')).forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = el.getAttribute('data-id');
                showDeleteConfirmModal(id, 'task');
            });
        });
    }

    // Función para renderizar tareas en vista de tabla
    async function renderTasksTable() {
        const all = await loadAllTasks();
        const q = (filterText && filterText.value || '').trim().toLowerCase();
        const st = (filterState && filterState.value) || '';
        const pr = (filterPriority && filterPriority.value) || '';
        const assignedFilter = (filterAssignedTo && filterAssignedTo.value) || '';
        const visibleByFilter = (filterVisibleBy && filterVisibleBy.value) || '';

        let items = all.filter(t => {
            // Filtro de privacidad: Si la tarea es privada y no la creamos nosotros, la ocultamos.
            if (t.private && t.createdBy !== CURRENT_USER) {
                return false;
            }

            // Aplicar filtro de estado
            if (st) {
                if (st === 'OPEN_TASKS') {
                    // Tareas abiertas: todas excepto "Finalizada"
                    if (t.state === 'Finalizada') return false;
                } else if (t.state !== st) {
                    return false;
                }
            }
            
            if (pr && t.priority !== pr) return false;

            // Aplicar filtro de asignado a
            if (assignedFilter) {
                if (assignedFilter === 'CURRENT_USER') {
                    if (t.assignedTo !== CURRENT_USER) return false;
                } else {
                    if (t.assignedTo.toLowerCase() !== assignedFilter.toLowerCase()) return false;
                }
            }

            // Aplicar filtro de visibilidad por usuario
            if (visibleByFilter) {
                const usersWhoSupervise = ALL_USERS_CACHE.filter(user =>
                    user.role !== 'Administrador' &&
                    (user.supervisedUsers || []).includes(visibleByFilter)
                ).map(user => user.username);

                usersWhoSupervise.push(visibleByFilter);

                items = items.filter(t =>
                    usersWhoSupervise.includes(t.createdBy) ||
                    usersWhoSupervise.includes(t.assignedTo)
                );
            }

            if (!q) return true;
            return (t.title || '').toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q);
        });

        // 🔒 Restricción de visibilidad para usuarios estándar
        if (CURRENT_USER_ROLE !== 'Administrador') {
            const currentUserData = ALL_USERS_CACHE.find(u => u.username === CURRENT_USER) || {};
            const supervised = currentUserData.supervisedUsers || [];
            items = items.filter(t =>
                t.createdBy === CURRENT_USER ||
                t.assignedTo === CURRENT_USER ||
                supervised.includes(t.createdBy) ||
                supervised.includes(t.assignedTo)
            );
        }

        // Ordenación dinámica según cabecera
        const priorityOrder = { 'Baja': 0, 'Media': 1, 'Alta': 2, 'Urgente': 3 };
        function compareValues(a, b, key) {
            switch (key) {
                case 'title': {
                    const va = (a.title || '').toString().toLowerCase();
                    const vb = (b.title || '').toString().toLowerCase();
                    return va.localeCompare(vb);
                }
                case 'createdBy': {
                    const va = (a.createdBy || '').toString().toLowerCase();
                    const vb = (b.createdBy || '').toString().toLowerCase();
                    return va.localeCompare(vb);
                }
                case 'assignedTo': {
                    const va = ((a.assignedTo || a.createdBy) || '').toString().toLowerCase();
                    const vb = ((b.assignedTo || b.createdBy) || '').toString().toLowerCase();
                    return va.localeCompare(vb);
                }
                case 'priority': {
                    const va = priorityOrder[a.priority] ?? -1;
                    const vb = priorityOrder[b.priority] ?? -1;
                    return va - vb;
                }
                case 'state': {
                    const va = (a.state || '').toString().toLowerCase();
                    const vb = (b.state || '').toString().toLowerCase();
                    return va.localeCompare(vb);
                }
                case 'private': {
                    const va = a.private ? 1 : 0;
                    const vb = b.private ? 1 : 0;
                    return va - vb;
                }
                case 'lastModified':
                default: {
                    const va = a.lastModified ? new Date(a.lastModified).getTime() : 0;
                    const vb = b.lastModified ? new Date(b.lastModified).getTime() : 0;
                    return va - vb;
                }
            }
        }

        items.sort((a, b) => {
            let cmp = compareValues(a, b, tableSort.key || 'lastModified');
            if (tableSort.direction === 'desc') cmp = -cmp;
            // Desempate por última modificación descendente
            if (cmp === 0) {
                const va = a.lastModified ? new Date(a.lastModified).getTime() : 0;
                const vb = b.lastModified ? new Date(b.lastModified).getTime() : 0;
                return vb - va;
            }
            return cmp;
        });

        if (!tasksTableBody) return;
        tasksTableBody.innerHTML = items.map(t => {
            const assignedToText = t.assignedTo || `${t.createdBy} (creador)`;
            return `
                <tr class="hover:bg-slate-700 transition-colors">
                    <td class="py-3 px-4">
                        <div class="task-table-open font-medium text-white cursor-pointer hover:text-indigo-300 transition-colors" data-id="${t.id}">${escapeHtml(t.title)}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-300">${escapeHtml(t.createdBy)}</td>
                    <td class="py-3 px-4 text-slate-300">${escapeHtml(assignedToText)}</td>
                    <td class="py-3 px-4">${priorityBadge(t.priority)}</td>
                    <td class="py-3 px-4">${stateBadge(t.state)}</td>
                    <td class="py-3 px-4">${privacyBadge(t.private || false)}</td>
                    <td class="py-3 px-4 text-slate-400 text-sm">${new Date(t.lastModified).toLocaleString()}</td>
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                            ${hasUnreadNotifications(t, CURRENT_USER) ? `
                                <div class="flex items-center gap-1 text-amber-400" title="Tienes ${getUnreadCount(t, CURRENT_USER)} notificación(es) sin leer">
                                    <div class="flex items-center justify-center w-4 h-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell">
                                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/>
                                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                                        </svg>
                                    </div>
                                    <span class="text-xs font-semibold">${getUnreadCount(t, CURRENT_USER)}</span>
                                </div>
                            ` : ''}
                            <button class="btn-edit-task text-indigo-300 hover:text-indigo-500 transition p-1" data-id="${t.id}" title="Editar tarea">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 20h9"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                            </button>
                            <button class="btn-delete-task text-rose-300 hover:text-rose-500 transition p-1" data-id="${t.id}" title="Eliminar tarea">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        // Adjuntar event listeners para abrir tarea solo en el título
        Array.from(tasksTableBody.querySelectorAll('.task-table-open')).forEach(el => {
            el.addEventListener('click', () => openTask(el.getAttribute('data-id')));
        });

        Array.from(tasksTableBody.querySelectorAll('.btn-edit-task')).forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = el.getAttribute('data-id');
                openTask(id);
            });
        });

        Array.from(tasksTableBody.querySelectorAll('.btn-delete-task')).forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = el.getAttribute('data-id');
                showDeleteConfirmModal(id, 'task');
            });
        });
    }

    // Render tasks (with filters and ordering) - Función principal que decide qué vista usar
    async function renderTasks() {
        if (currentViewMode === 'table') {
            await renderTasksTable();
        } else {
            await renderTasksCards();
        }
        
        // Actualizar el indicador de notificaciones del header
        updateNotificationsIndicator();
        
        // 🔄 NUEVO: Actualizar también las notificaciones de la pantalla de gestión de usuarios
        updateNotificationsIndicatorUserManagement();
    }

    // --- Manejo de Pantallas (Login y Principal) ---

    // Muestra la pantalla de login y oculta la principal
    function showLoginScreen() {
        if (screenLogin) screenLogin.classList.remove('hidden');
        if (screenMain) screenMain.classList.add('hidden');
        if (screenUserManagement) screenUserManagement.classList.add('hidden'); // Asegurarse de ocultar la de gestión
        if (loginErrorMessage) loginErrorMessage.classList.add('hidden'); // Limpiar mensaje de error
        if (loginUsername) loginUsername.value = ''; // Limpiar campos
        if (loginPassword) loginPassword.value = '';
        
        // Ocultar el indicador de notificaciones
        if (notificationsIndicator) {
            notificationsIndicator.classList.add('hidden');
        }

        // Poner foco en el campo de usuario tras mostrar la pantalla de login
        if (loginUsername) {
            // Usar un pequeño diferido para asegurar que el DOM esté listo y visible
            setTimeout(() => {
                try {
                    loginUsername.focus();
                    loginUsername.select();
                } catch (err) {}
            }, 0);
        }
    }

    // Muestra la pantalla principal y oculta la de login
    async function showMainScreen(user, role) {
        CURRENT_USER = user;
        CURRENT_USER_ROLE = role;

        if (currentUserEl) currentUserEl.textContent = user;
        if (chatUser) chatUser.textContent = user;
        if (screenLogin) screenLogin.classList.add('hidden');
        if (screenUserManagement) screenUserManagement.classList.add('hidden'); // Asegurarse de ocultar la de gestión
        if (screenMain) screenMain.classList.remove('hidden');

        // Lógica para mostrar/ocultar el botón de gestión de usuarios
        if (btnUserManagement) {
            if (CURRENT_USER_ROLE === 'Administrador') {
                btnUserManagement.classList.remove('hidden');
            } else {
                btnUserManagement.classList.add('hidden');
            }
        }

        // 🔄 NUEVO: Cargar preferencias del usuario y aplicar vista
        await loadUserPreferences();
        applyCurrentView();

        await populateAssignedUsers();
        // Fijar el filtro "Asignado a" al usuario actual al entrar por primera vez
        if (filterAssignedTo) {
            filterAssignedTo.value = CURRENT_USER;
            filterAssignedTo.dataset.initialized = 'true';
        }
        // Asegurar disponibilidad del checkbox de privacidad según el nuevo usuario
        updateNewPrivateAvailability();
        await renderTasks();
        
        // Actualizar el indicador de notificaciones
        updateNotificationsIndicator();
        
        // 🔄 NUEVO: Actualizar también las notificaciones de la pantalla de gestión de usuarios
        updateNotificationsIndicatorUserManagement();
        
        // 🔄 NUEVO: Iniciar monitoreo de cambios de configuración
        startConfigMonitoring();
    }

    // Muestra la pantalla de gestión de usuarios y oculta las demás
    async function showUserManagementScreen() {
        // 🔄 NUEVO: Registrar actividad del usuario
        await recordUserActivity();
        
        if (screenMain) screenMain.classList.add('hidden');
        if (screenLogin) screenLogin.classList.add('hidden');
        if (screenUserManagement) screenUserManagement.classList.remove('hidden');
        
        // Mostrar el usuario actual en la barra superior
        const currentUserElement = document.getElementById('current-user-user-management');
        if (currentUserElement && CURRENT_USER) {
            currentUserElement.textContent = CURRENT_USER;
        }
        
        // Esperar un momento para que el DOM se actualice antes de configurar el menú
        setTimeout(async () => {
            await loadUsers(); // Cargar los usuarios al entrar a la pantalla
            resetAddUserForm(); // Limpiar y resetear el formulario de añadir

            // Añadir event listener para el filtro de visibilidad en la gestión de usuarios
            if (filterVisibleBy) {
                filterVisibleBy.addEventListener('change', () => {
                    const filters = {
                        name: filterUserName.value.trim(),
                        role: filterUserRole.value,
                        visibleBy: filterVisibleBy.value
                    };
                    loadUsers(filters);
                });
            }

            // Configurar el menú hamburguesa para la pantalla de gestión de usuarios
            console.log('Configurando menú hamburguesa para gestión de usuarios...');
            setupUserManagementHamburgerMenu();
            
            // 🔄 NUEVO: Actualizar notificaciones en esta pantalla
            updateNotificationsIndicatorUserManagement();
        }, 100);
    }
    
    // Muestra el modal de ayuda
    async function showHelpModal() {
        if (helpModal && helpContent) {
            // Determinar qué contenido de ayuda mostrar según la pantalla actual
            const currentScreen = getCurrentScreen();
            const helpContentHTML = generateHelpContent(currentScreen);
            
            helpContent.innerHTML = helpContentHTML;
            helpModal.classList.remove('hidden');
            helpModal.classList.add('flex');
            
            // Cerrar el menú hamburguesa
            if (hamburgerDropdown) {
                hamburgerDropdown.classList.remove('show');
            }

            // Si estamos en la pantalla principal, cargar la lista de administradores
            if (currentScreen === 'main') {
                await loadActiveAdminsList();
            }
        }
    }
    
    // Cierra el modal de ayuda
    function closeHelpModal() {
        if (helpModal) {
            helpModal.classList.add('hidden');
            helpModal.classList.remove('flex');
        }
    }

    // 🔄 NUEVO: Cerrar modal de ayuda al hacer clic fuera
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            // Si se hace clic en el fondo del modal (no en el contenido)
            if (e.target === helpModal) {
                closeHelpModal();
            }
        });
    }

    // Configura el menú hamburguesa para la pantalla de gestión de usuarios
    function setupUserManagementHamburgerMenu() {
        console.log('Iniciando configuración del menú hamburguesa de gestión de usuarios...');
        
        // Verificar que estamos en la pantalla correcta
        if (!screenUserManagement || screenUserManagement.classList.contains('hidden')) {
            console.warn('Advertencia: Intentando configurar menú hamburguesa en pantalla no visible');
        }
        
        const userManagementHamburgerButton = document.getElementById('hamburger-button-user-management');
        const userManagementHamburgerDropdown = document.getElementById('hamburger-dropdown-user-management');
        
        console.log('Elementos encontrados:', {
            button: userManagementHamburgerButton,
            dropdown: userManagementHamburgerDropdown,
            buttonVisible: userManagementHamburgerButton ? !userManagementHamburgerButton.classList.contains('hidden') : false,
            dropdownVisible: userManagementHamburgerDropdown ? !userManagementHamburgerDropdown.classList.contains('hidden') : false
        });
        
        // Verificar que los elementos existen antes de continuar
        if (!userManagementHamburgerButton) {
            console.error('Error: No se encontró el botón hamburguesa de gestión de usuarios');
            // Intentar de nuevo en 100ms
            setTimeout(() => {
                console.log('Reintentando configuración del menú hamburguesa...');
                setupUserManagementHamburgerMenu();
            }, 100);
            return;
        }
        
        if (!userManagementHamburgerDropdown) {
            console.error('Error: No se encontró el dropdown del menú hamburguesa de gestión de usuarios');
            // Intentar de nuevo en 100ms
            setTimeout(() => {
                console.log('Reintentando configuración del menú hamburguesa...');
                setupUserManagementHamburgerMenu();
            }, 100);
            return;
        }
        
        // Verificar que los elementos son visibles
        if (userManagementHamburgerButton.classList.contains('hidden')) {
            console.warn('Advertencia: El botón hamburguesa está oculto');
        }
        
        // Remover event listeners anteriores si existen para evitar duplicados
        const newUserManagementHamburgerButton = userManagementHamburgerButton.cloneNode(true);
        userManagementHamburgerButton.parentNode.replaceChild(newUserManagementHamburgerButton, userManagementHamburgerButton);
        
        console.log('Botón hamburguesa clonado y reemplazado');
        
        // Toggle del menú
        newUserManagementHamburgerButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botón hamburguesa de gestión de usuarios clickeado');
            
            // Verificar que el dropdown existe antes de intentar toggle
            if (userManagementHamburgerDropdown) {
                userManagementHamburgerDropdown.classList.toggle('show');
                console.log('Estado del dropdown después del toggle:', userManagementHamburgerDropdown.classList.contains('show'));
            } else {
                console.error('Error: Dropdown no encontrado al hacer clic');
            }
        });

        // Cerrar al hacer clic fuera - usar variables únicas para evitar conflictos
        const closeUserManagementHamburger = (e) => {
            if (!newUserManagementHamburgerButton.contains(e.target) && !userManagementHamburgerDropdown.contains(e.target)) {
                userManagementHamburgerDropdown.classList.remove('show');
                console.log('Cerrando menú hamburguesa por clic fuera');
            }
        };
        
        // Remover listener anterior si existe
        document.removeEventListener('click', closeUserManagementHamburger);
        document.addEventListener('click', closeUserManagementHamburger);

        // Configurar botones del menú
        const btnBackToMain = document.getElementById('btn-back-to-main-from-user-list');
        const btnChangePassword = document.getElementById('btn-change-password-user-management');
        const btnDeleteOwnAccount = document.getElementById('btn-delete-own-account-user-management');
        const btnHelp = document.getElementById('btn-help-user-management');
        const btnLogout = document.getElementById('btn-logout-user-management');

        console.log('Botones del menú encontrados:', {
            backToMain: btnBackToMain,
            changePassword: btnChangePassword,
            deleteOwnAccount: btnDeleteOwnAccount,
            help: btnHelp,
            logout: btnLogout
        });

        if (btnBackToMain) {
            btnBackToMain.addEventListener('click', () => {
                console.log('Botón "Volver a Tareas" clickeado');
                userManagementHamburgerDropdown.classList.remove('show');
                showMainScreenFromUserManagement();
            });
        }

        if (btnChangePassword) {
            btnChangePassword.addEventListener('click', () => {
                console.log('Botón "Cambiar Contraseña" clickeado');
                userManagementHamburgerDropdown.classList.remove('show');
                showChangePasswordModal();
            });
        }

        if (btnDeleteOwnAccount) {
            btnDeleteOwnAccount.addEventListener('click', () => {
                console.log('Botón "Eliminar Mi Cuenta" clickeado');
                userManagementHamburgerDropdown.classList.remove('show');
                showDeleteOwnAccountModal();
            });
        }

        if (btnHelp) {
            btnHelp.addEventListener('click', () => {
                console.log('Botón "Ayuda" clickeado');
                userManagementHamburgerDropdown.classList.remove('show');
                showHelpModal();
            });
        }

        if (btnLogout) {
            console.log('Botón de logout de gestión de usuarios encontrado, añadiendo event listener');
            btnLogout.addEventListener('click', () => {
                console.log('Botón "Cerrar Sesión" clickeado en gestión de usuarios');
                userManagementHamburgerDropdown.classList.remove('show');
                logout();
            });
        } else {
            console.error('Botón de logout de gestión de usuarios NO encontrado');
        }
        
        console.log('Menú hamburguesa de gestión de usuarios configurado correctamente');
        
        // Verificar que el botón es clickeable
        console.log('Verificando que el botón es clickeable...');
        console.log('Botón display:', window.getComputedStyle(newUserManagementHamburgerButton).display);
        console.log('Botón visibility:', window.getComputedStyle(newUserManagementHamburgerButton).visibility);
        console.log('Botón pointer-events:', window.getComputedStyle(newUserManagementHamburgerButton).pointerEvents);
    }
    
    // Determina la pantalla actual
    function getCurrentScreen() {
        if (screenMain && !screenMain.classList.contains('hidden')) {
            return 'main';
        } else if (screenUserManagement && !screenUserManagement.classList.contains('hidden')) {
            return 'user-management';
        } else {
            return 'login';
        }
    }
    
    // Genera el contenido de ayuda según la pantalla actual
    function generateHelpContent(screen) {
        switch (screen) {
            case 'main':
                return generateMainScreenHelp();
            case 'user-management':
                return generateUserManagementHelp();
            default:
                return generateGeneralHelp();
        }
    }
    
    // Genera el contenido de ayuda para la pantalla principal
    function generateMainScreenHelp() {
        return `
            <div class="help-section">
                <h3>📋 Pantalla de Mis Tareas</h3>
                <p>Esta es la pantalla principal donde puedes gestionar todas tus tareas y las de los usuarios que supervisas.</p>
            </div>
            
            <div class="help-section">
                <h3>➕ Crear Nueva Tarea</h3>
                <p>En esta sección puedes crear nuevas tareas con los siguientes campos:</p>
                <ul>
                    <li><strong>Título:</strong> Nombre descriptivo de la tarea (obligatorio)</li>
                    <li><strong>Prioridad:</strong> Urgente, Alta, Media o Baja</li>
                    <li><strong>Descripción:</strong> Detalles adicionales de la tarea (opcional)</li>
                    <li><strong>Asignado a:</strong> Usuario responsable de la tarea</li>
                    <li><strong>Tarea privada:</strong> Si está marcada, solo será visible para el creador</li>
                </ul>
                <div class="help-feature">
                    <strong>💡 Tip:</strong> Las tareas privadas solo son visibles para quien las creó, mientras que las públicas pueden ser vistas por todos los usuarios con permisos.
                </div>
            </div>
            
            <div class="help-section">
                <h3>🔍 Filtrar Tareas</h3>
                <p>Utiliza los filtros para encontrar tareas específicas:</p>
                <ul>
                    <li><strong>Buscar por texto:</strong> Busca en títulos y descripciones</li>
                    <li><strong>Estado:</strong> Filtra por estado de la tarea (Sin iniciar, En progreso, En espera, Finalizada)</li>
                    <li><strong>Prioridad:</strong> Filtra por nivel de prioridad</li>
                    <li><strong>Asignado a:</strong> Filtra por usuario responsable</li>
                </ul>
                <div class="help-feature">
                    <strong>🔄 Resetear Filtros:</strong> Limpia todos los filtros aplicados para ver todas las tareas.
                </div>
            </div>
            
            <div class="help-section">
                <h3>📱 Gestión de Tareas</h3>
                <p>Cada tarea muestra información importante:</p>
                <ul>
                    <li><strong>Estado:</strong> Indica el progreso actual de la tarea</li>
                    <li><strong>Prioridad:</strong> Nivel de urgencia con código de colores</li>
                    <li><strong>Asignado a:</strong> Usuario responsable</li>
                    <li><strong>Fecha de creación:</strong> Cuándo se creó la tarea</li>
                    <li><strong>Última modificación:</strong> Cuándo se actualizó por última vez</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h3>💬 Sistema de Chat</h3>
                <p>Cada tarea tiene un chat integrado para comunicación:</p>
                <ul>
                    <li><strong>Mensajes del sistema:</strong> Se generan automáticamente al cambiar estados o asignar tareas</li>
                    <li><strong>Mensajes de usuario:</strong> Comentarios y notas de los usuarios</li>
                    <li><strong>Notificaciones:</strong> Indicador visual cuando hay mensajes nuevos</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h3>👥 Usuarios Administradores</h3>
                <p>Los usuarios con rol de <strong>Administrador</strong> tienen acceso completo al sistema:</p>
                <ul>
                    <li><strong>Gestión de usuarios:</strong> Crear, editar y eliminar usuarios</li>
                    <li><strong>Visibilidad total:</strong> Pueden ver todas las tareas del sistema</li>
                    <li><strong>Configuración del sistema:</strong> Acceso a todas las funcionalidades</li>
                    <li><strong>Supervisión:</strong> Pueden supervisar a cualquier usuario</li>
                </ul>
                <div class="help-feature">
                    <strong>🔒 Seguridad:</strong> Solo los administradores pueden gestionar usuarios y acceder a configuraciones avanzadas.
                </div>
                <div id="active-admins-list" class="mt-3 p-3 bg-slate-700 rounded-lg">
                    <h4 class="text-sm font-medium mb-2 text-emerald-300">👑 Administradores Actualmente Activos:</h4>
                    <div id="admins-list-content" class="text-sm text-slate-300">
                        <p class="italic">Cargando lista de administradores...</p>
                    </div>
                </div>
            </div>
            
            <div class="help-section">
                <h3>🔔 Notificaciones</h3>
                <p>El sistema te notifica de:</p>
                <ul>
                    <li><strong>Mensajes nuevos:</strong> En el chat de las tareas</li>
                    <li><strong>Cambios de estado:</strong> Cuando se actualiza una tarea</li>
                    <li><strong>Asignaciones:</strong> Cuando se te asigna una nueva tarea</li>
                </ul>
                <div class="help-feature">
                    <strong>📊 Indicador:</strong> El icono de campana muestra el número total de notificaciones pendientes.
                </div>
            </div>
        `;
    }
    
    // Genera el contenido de ayuda para la pantalla de gestión de usuarios
    function generateUserManagementHelp() {
        return `
            <div class="help-section">
                <h3>👥 Gestión de Usuarios</h3>
                <p>Esta pantalla permite a los administradores gestionar todos los usuarios del sistema.</p>
            </div>
            
            <div class="help-section">
                <h3>➕ Añadir Nuevo Usuario</h3>
                <p>Para crear un nuevo usuario, completa los siguientes campos:</p>
                <ul>
                    <li><strong>Nombre de Usuario:</strong> Identificador único del usuario</li>
                    <li><strong>Contraseña:</strong> Debe tener al menos 3 caracteres</li>
                    <li><strong>Tipo de Usuario:</strong> Estándar o Administrador</li>
                </ul>
                <div class="help-feature">
                    <strong>⚠️ Importante:</strong> Solo los usuarios administradores pueden crear nuevos usuarios.
                </div>
            </div>
            
            <div class="help-section">
                <h3>🔍 Filtros de Usuarios</h3>
                <p>Utiliza los filtros para encontrar usuarios específicos:</p>
                <ul>
                    <li><strong>Buscar por Nombre:</strong> Filtra usuarios por nombre</li>
                    <li><strong>Filtrar por Rol:</strong> Muestra solo usuarios con un rol específico</li>
                    <li><strong>Usuarios con visibilidad de:</strong> Muestra usuarios que pueden ver las tareas de un usuario específico</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h3>✏️ Editar Usuario</h3>
                <p>Al hacer clic en "Editar" se abre un modal con opciones avanzadas:</p>
                <ul>
                    <li><strong>Cambiar rol:</strong> Promover o degradar usuarios entre Estándar y Administrador</li>
                    <li><strong>Cambiar contraseña:</strong> Actualizar la contraseña del usuario</li>
                    <li><strong>Gestionar visibilidad:</strong> Controlar qué usuarios pueden ver las tareas de otros</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h3>👁️ Sistema de Visibilidad</h3>
                <p>El sistema de visibilidad controla qué usuarios pueden ver las tareas de otros:</p>
                <ul>
                    <li><strong>Usuarios Disponibles:</strong> Lista de todos los usuarios que pueden ser supervisados</li>
                    <li><strong>Usuarios con Visibilidad:</strong> Usuarios que pueden ver las tareas del usuario seleccionado</li>
                    <li><strong>Doble clic:</strong> Haz doble clic en un usuario para moverlo entre las listas</li>
                </ul>
                <div class="help-feature">
                    <strong>💡 Tip:</strong> Los administradores tienen visibilidad total sobre todas las tareas del sistema.
                </div>
            </div>
            
            <div class="help-section">
                <h3>🗑️ Eliminar Usuario</h3>
                <p>Al eliminar un usuario:</p>
                <ul>
                    <li><strong>Reasignación automática:</strong> Las tareas se reasignan automáticamente a sus creadores</li>
                    <li><strong>Protección de administradores:</strong> No se puede eliminar el último administrador</li>
                    <li><strong>Verificación de dependencias:</strong> El sistema verifica que no haya conflictos antes de eliminar</li>
                </ul>
                <div class="help-feature">
                    <strong>⚠️ Seguridad:</strong> La eliminación de usuarios es irreversible y puede afectar la asignación de tareas.
                </div>
            </div>
            
            <div class="help-section">
                <h3>🔒 Roles y Permisos</h3>
                <p>El sistema tiene dos tipos de usuarios:</p>
                <ul>
                    <li><strong>Estándar:</strong> Pueden crear y gestionar sus propias tareas, y las de usuarios que supervisan</li>
                    <li><strong>Administrador:</strong> Acceso completo al sistema, incluyendo gestión de usuarios y visibilidad total</li>
                </ul>
            </div>
        `;
    }
    
    // Genera el contenido de ayuda general
    function generateGeneralHelp() {
        return `
            <div class="help-section">
                <h3>🎯 Sistema de Gestión de Tareas</h3>
                <p>Bienvenido al sistema de gestión de tareas. Esta aplicación te permite organizar y gestionar tareas de manera eficiente.</p>
            </div>
            
            <div class="help-section">
                <h3>🔐 Inicio de Sesión</h3>
                <p>Para comenzar a usar el sistema, debes iniciar sesión con tu usuario y contraseña.</p>
                <div class="help-feature">
                    <strong>👤 Usuario por defecto:</strong> Admin / 244466666
                </div>
            </div>
            
            <div class="help-section">
                <h3>📱 Navegación</h3>
                <p>El sistema tiene tres pantallas principales:</p>
                <ul>
                    <li><strong>Pantalla de Login:</strong> Para autenticarte en el sistema</li>
                    <li><strong>Pantalla Principal:</strong> Gestión de tareas y creación</li>
                    <li><strong>Gestión de Usuarios:</strong> Administración del sistema (solo administradores)</li>
                </ul>
            </div>
        `;
    }

    // Carga y muestra la lista de administradores activos en la ayuda
    async function loadActiveAdminsList() {
        try {
            const adminsListContent = document.getElementById('admins-list-content');
            if (!adminsListContent) return;

            // Obtener todos los usuarios
            const allUsers = await window.api.getUsers();
            
            // Filtrar solo los administradores
            const activeAdmins = allUsers.filter(user => user.role === 'Administrador');
            
            if (activeAdmins.length === 0) {
                adminsListContent.innerHTML = '<p class="text-amber-400 italic">No hay administradores activos en el sistema.</p>';
                return;
            }

            // Crear la lista de administradores
            let adminsHTML = '';
            activeAdmins.forEach((admin, index) => {
                const isLast = index === activeAdmins.length - 1;
                adminsHTML += `
                    <div class="flex items-center gap-2 ${!isLast ? 'mb-2' : ''}">
                        <span class="w-2 h-2 bg-emerald-400 rounded-full"></span>
                        <span class="font-medium">${admin.username}</span>
                        <span class="text-xs text-slate-400">(Administrador)</span>
                    </div>
                `;
            });

            adminsListContent.innerHTML = adminsHTML;
        } catch (error) {
            console.error('Error al cargar la lista de administradores:', error);
            const adminsListContent = document.getElementById('admins-list-content');
            if (adminsListContent) {
                adminsListContent.innerHTML = '<p class="text-rose-400 italic">Error al cargar la lista de administradores.</p>';
            }
        }
    }

    // Muestra el modal de cambio de contraseña
    function showChangePasswordModal() {
        if (changePasswordModal) {
            changePasswordModal.classList.remove('hidden');
            changePasswordModal.classList.add('flex');
            // Limpiar campos
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
            // Inicializar botón en estado deshabilitado
            if (btnSaveNewPassword) {
                btnSaveNewPassword.disabled = true;
                btnSaveNewPassword.classList.add('btn-disabled');
                btnSaveNewPassword.classList.remove('hover:bg-amber-700');
            }
        }
    }

    // Muestra el modal de eliminación de cuenta propia
    function showDeleteOwnAccountModal() {
        if (CURRENT_USER) {
            showDeleteConfirmModal(CURRENT_USER, 'own-account');
        }
    }

    // Función para cerrar sesión
    async function logout() {
        try {
            console.log('Función logout() ejecutada');
            
            // Marcar al usuario como offline antes de cerrar sesión
            if (CURRENT_USER) {
                try {
                    const allUsers = await window.api.getUsers();
                    const currentUserIndex = allUsers.findIndex(u => u.username === CURRENT_USER);
                    if (currentUserIndex !== -1) {
                        // Marcar como offline (última actividad hace más de 5 minutos)
                        const offlineTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutos atrás
                        allUsers[currentUserIndex].lastActivity = offlineTime.toISOString();
                        await window.api.writeUsers(allUsers);
                        console.log(`🔴 Usuario ${CURRENT_USER} marcado como offline al cerrar sesión`);
                    }
                } catch (error) {
                    console.error('Error al marcar usuario como offline al cerrar sesión:', error);
                }
            }
            
            // Detener monitoreo de cambios de configuración (si existe la función)
            if (typeof stopConfigMonitoring === 'function') {
                try {
                    stopConfigMonitoring();
                } catch (error) {
                    console.error('Error al detener monitoreo de configuración:', error);
                }
            }
            
            // Detener monitoreo de estado online (si existe la función)
            if (typeof stopOnlineStatusMonitoring === 'function') {
                try {
                    stopOnlineStatusMonitoring();
                } catch (error) {
                    console.error('Error al detener monitoreo de estado online:', error);
                }
            }
            
            // Resetear variables de usuario
            CURRENT_USER = null;
            CURRENT_USER_ROLE = null;
            
            // Limpiar preferencias del usuario al cerrar sesión
            userPreferences = {};
            
            // Limpiar menús hamburguesa
            if (typeof cleanupUserManagementHamburgerMenu === 'function') {
                try {
                    cleanupUserManagementHamburgerMenu();
                } catch (error) {
                    console.error('Error al limpiar menú de gestión de usuarios:', error);
                }
            }
            
            // Ocultar todas las pantallas
            if (screenMain) screenMain.classList.add('hidden');
            if (screenUserManagement) screenUserManagement.classList.add('hidden');
            
            // Mostrar pantalla de login
            if (screenLogin) screenLogin.classList.remove('hidden');
            
            // Limpiar campos de login
            const loginUsername = document.getElementById('login-username');
            const loginPassword = document.getElementById('login-password');
            if (loginUsername) loginUsername.value = '';
            if (loginPassword) loginPassword.value = '';
            
            // Limpiar mensajes de error
            const loginErrorMessage = document.getElementById('login-error-message');
            if (loginErrorMessage) {
                loginErrorMessage.classList.add('hidden');
                loginErrorMessage.textContent = '';
            }
            
            // Cerrar modales abiertos
            if (helpModal && typeof closeHelpModal === 'function') {
                try {
                    closeHelpModal();
                } catch (error) {
                    console.error('Error al cerrar modal de ayuda:', error);
                }
            }
            if (changePasswordModal) changePasswordModal.classList.add('hidden');
            
            // Cerrar menús hamburguesa
            if (hamburgerDropdown) hamburgerDropdown.classList.remove('show');
            const hamburgerDropdownUserManagement = document.getElementById('hamburger-dropdown-user-management');
            if (hamburgerDropdownUserManagement) hamburgerDropdownUserManagement.classList.remove('show');
            
            // Limpiar caché de tareas y usuarios
            ALL_TASKS_CACHE = [];
            ALL_USERS_CACHE = [];
            
            showToast('Sesión cerrada correctamente', 'success');
            
        } catch (error) {
            console.error('Error durante el cierre de sesión:', error);
            showToast('Error al cerrar sesión', 'error');
        }
    }


    // -----------------------------------------------------------------------------
    // Lógica del Formulario de Usuario (Añadir/Editar) y Tabla
    // -----------------------------------------------------------------------------

    // Carga todos los usuarios y los renderiza en la tabla y los checkboxes de visibilidad
    async function loadUsers(filters = {}) {
        const allUsers = await window.api.getUsers();
        ALL_USERS_CACHE = allUsers; // Actualizar el caché de usuarios

        // Nuevo: Rellenar el filtro "Usuarios con visibilidad de:" antes de aplicar filtros
        if (filterVisibleBy) {
            // Excluir administradores de esta lista
            const nonAdminUsers = allUsers.filter(user => user.role !== 'Administrador');
            filterVisibleBy.innerHTML = `
                <option value="">Cualquier usuario</option>
                ${nonAdminUsers.map(user => `<option value="${escapeHtml(user.username)}">${escapeHtml(user.username)}</option>`).join('')}
            `;
            // Mantener la selección actual del filtro si existe
            if (filters.visibleBy) {
                filterVisibleBy.value = filters.visibleBy;
            }
        }

        // Aplicar filtros
        let filteredUsers = allUsers;
        if (filters.name) {
            const nameLower = filters.name.toLowerCase();
            filteredUsers = filteredUsers.filter(user => user.username.toLowerCase().includes(nameLower));
        }
        if (filters.role) {
            filteredUsers = filteredUsers.filter(user => user.role === filters.role);
        }

        // Nuevo: Aplicar filtro de visibilidad por usuario en la gestión de usuarios
        if (filters.visibleBy) {
            const visibleByUsername = filters.visibleBy;
            // Encontrar todos los usuarios que supervisan al `visibleByUsername`
            const usersWhoSupervise = allUsers.filter(user =>
                user.role !== 'Administrador' && // No incluir administradores
                (user.supervisedUsers || []).includes(visibleByUsername)
            ).map(user => user.username);

            // Si el usuario seleccionado en el filtro no es administrador, incluir sus propias tareas
            const selectedUserIsAdmin = allUsers.find(u => u.username === visibleByUsername)?.role === 'Administrador';
            if (!selectedUserIsAdmin) {
                usersWhoSupervise.push(visibleByUsername);
            }

            filteredUsers = filteredUsers.filter(user => usersWhoSupervise.includes(user.username));
        }

        renderUsersTable(filteredUsers);
    }

    // Función para aplicar filtros en tiempo real
    function applyUserFilters() {
        const filters = {
            name: filterUserName ? filterUserName.value.trim() : '',
            role: filterUserRole ? filterUserRole.value : '',
            visibleBy: filterVisibleBy ? filterVisibleBy.value : ''
        };
        loadUsers(filters);
    }

    // Renderiza la tabla de usuarios
    function renderUsersTable(users) {
        usersTableBody.innerHTML = ''; // Limpiar tabla
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            row.className = 'hover:bg-slate-600 transition-colors duration-200';

            // Mostrar los usuarios con visibilidad o "Todos" si es Administrador
            let supervisedUsersText = '-';
            if (user.role === 'Administrador') {
                supervisedUsersText = 'Todos'; // Los administradores ven todas las tareas
            } else if (user.supervisedUsers && user.supervisedUsers.length > 0) {
                supervisedUsersText = user.supervisedUsers.join(', ');
            }

            // 🔄 MEJORA: Sistema de estado online/offline más inteligente
            // Un usuario está online si:
            // 1. Es el usuario actual (siempre online)
            // 2. Ha tenido actividad reciente (últimos 5 minutos)
            const now = new Date();
            const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
            const isRecentlyActive = lastActivity && (now - lastActivity) < 5 * 60 * 1000; // 5 minutos
            
            const isOnline = user.username === CURRENT_USER || isRecentlyActive;
            const statusText = isOnline ? '🟢 Online' : '🔴 Offline';
            const statusColor = isOnline ? 'text-green-400' : 'text-red-400';
            const statusTitle = isOnline 
                ? (user.username === CURRENT_USER ? 'Usuario actualmente conectado' : 'Usuario activo recientemente')
                : 'Usuario inactivo';
            


            row.innerHTML = `
                <td class="py-3 px-4">${user.username}</td>
                <td class="py-3 px-4">${user.role}</td>
                <td class="py-3 px-4 text-sm">${supervisedUsersText}</td>
                <td class="py-3 px-4">
                    <button class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm mr-2 js-edit-user" data-username="${user.username}">Editar</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm js-delete-user" data-username="${user.username}">Eliminar</button>
                </td>
            `;
        });

        // Adjuntar event listeners a los botones de editar y eliminar
        usersTableBody.querySelectorAll('.js-edit-user').forEach(button => {
            button.addEventListener('click', (e) => {
                editUser(e.target.dataset.username);
            });
        });

        usersTableBody.querySelectorAll('.js-delete-user').forEach(button => {
            button.addEventListener('click', (e) => {
                // Modificado: Llama a showDeleteConfirmModal con el tipo 'user'
                const username = e.target.dataset.username;
                if (username === CURRENT_USER) {
                    showErrorMessageModal('Error de Eliminación', 'No puedes eliminar tu propia cuenta.'); // Usar el modal para este error
                    return;
                }
                showDeleteConfirmModal(username, 'user');
            });
        });
    }

    // Renderiza las listas de usuarios para la nueva interfaz de visibilidad
    async function renderVisibilityListsForEditModal(usersToSelectFrom, selectedSupervisedUsers = []) {
        if (!availableUsersList || !supervisedUsersList) return;

        // Limpiar listas existentes
        availableUsersList.innerHTML = '';
        supervisedUsersList.innerHTML = '';

        // Separar usuarios en disponibles y usuarios con visibilidad
        const availableUsers = usersToSelectFrom.filter(user => !selectedSupervisedUsers.includes(user.username));
        const supervisedUsers = usersToSelectFrom.filter(user => selectedSupervisedUsers.includes(user.username));

        // Renderizar usuarios disponibles
        if (availableUsers.length > 0) {
            availableUsers.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'flex items-center p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition-colors cursor-pointer';
                userDiv.dataset.username = user.username;
                userDiv.innerHTML = `
                    <span class="text-sm text-slate-200">${user.username} (${user.role})</span>
                `;
                availableUsersList.appendChild(userDiv);
            });
        } else {
            availableUsersList.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">No hay usuarios disponibles</p>';
        }

        // Renderizar usuarios con visibilidad
        if (supervisedUsers.length > 0) {
            supervisedUsers.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'flex items-center p-2 bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors cursor-pointer';
                userDiv.dataset.username = user.username;
                userDiv.innerHTML = `
                    <span class="text-sm text-white">${user.username} (${user.role})</span>
                `;
                supervisedUsersList.appendChild(userDiv);
            });
        } else {
            supervisedUsersList.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">No hay usuarios con visibilidad</p>';
        }

        // Los botones de transferencia ya no existen, se usa solo doble clic
    }

    // Resetea el formulario de AÑADIR usuario
    function resetAddUserForm() {
        userManagementUsernameAdd.value = '';
        userManagementPasswordAdd.value = '';
        userManagementRoleAdd.value = 'Usuario';
    }

    // Maneja el guardado (añadir) de un nuevo usuario
    if (btnAddUser) {
        btnAddUser.addEventListener('click', async () => {
            const username = userManagementUsernameAdd.value.trim();
            const password = userManagementPasswordAdd.value.trim();
            const role = userManagementRoleAdd.value;

            console.log('Intento añadir usuario:', username); // LOG 1

            // Validaciones básicas de campos vacíos
            if (!username) {
                showErrorMessageModal('Error al añadir usuario', 'El nombre de usuario no puede estar vacío.');
                console.log('Error: Nombre de usuario vacío.'); // LOG 2
                return;
            }
            if (!password) {
                showErrorMessageModal('Error al añadir usuario', 'La contraseña es obligatoria para nuevos usuarios.');
                console.log('Error: Contraseña vacía.'); // LOG 3
                return;
            }

            // *** INICIO DE LA NUEVA LÓGICA DE VALIDACIÓN DE USUARIO EXISTENTE ***
            const allUsers = await window.api.getUsers(); // <-- Revisa esta línea
            console.log('Usuarios obtenidos de la API:', allUsers); // LOG 4

            // Comprobar si el usuario ya existe (insensible a mayúsculas y minúsculas)
            const userExists = allUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
            console.log('Usuario a comprobar:', username.toLowerCase()); // LOG 5
            console.log('¿Usuario existe (true/false)?', userExists); // LOG 6

            if (userExists) {
                showErrorMessageModal('Error al añadir usuario', 'El nombre de usuario ya existe. Por favor, elige otro.');
                console.log('Error: Usuario ya existe. Deteniendo la operación.'); // LOG 7
                return; // Detener la ejecución si el usuario ya existe
            }
            // *** FIN DE LA NUEVA LÓGICA ***

            console.log('Usuario no existe, procediendo a guardar...'); // LOG 8
            const userData = { username, password, role, supervisedUsers: [] };
            const result = await window.api.saveUser(userData);

            if (result.success) {
                // Mostrar modal de éxito en lugar del toast
                showUserCreatedSuccessModal();
                resetAddUserForm();
                loadUsers();
                await populateAssignedUsers();
            } else {
                showErrorMessageModal('Error al añadir usuario', `Error al añadir usuario: ${result.message}`);
                console.log('Error al guardar usuario:', result.message); // LOG 9
            }
        });
    }


    // 🔒 FUNCIÓN AUXILIAR: Verificar si un usuario es el último administrador
    async function checkIfLastAdmin(username, currentRole) {
        if (currentRole !== 'Administrador') return false;
        
        try {
            const allUsers = await window.api.getUsers();
            const adminUsers = allUsers.filter(u => u.role === 'Administrador');
            return adminUsers.length === 1 && adminUsers[0].username === username;
        } catch (error) {
            console.error('Error al verificar si es el último administrador:', error);
            return false;
        }
    }
    
    // 🔒 FUNCIÓN AUXILIAR: Verificar si se puede cambiar de administrador a estándar
    async function checkIfCanChangeToStandard(username) {
        try {
            const allUsers = await window.api.getUsers();
            const adminUsers = allUsers.filter(u => u.role === 'Administrador');
            
            // Si solo hay un administrador y es el usuario que se está editando, no se puede cambiar
            if (adminUsers.length === 1 && adminUsers[0].username === username) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error al verificar si se puede cambiar a estándar:', error);
            return false;
        }
    }

    // Abre el modal para editar un usuario existente
    async function editUser(username) {
        const allUsers = ALL_USERS_CACHE;
        const userToEdit = allUsers.find(u => u.username === username);

        if (userToEdit) {
            editingUsername = userToEdit.username;
            editUserModalTitle.textContent = `Editar Usuario: ${userToEdit.username}`;
            editUserUsername.value = userToEdit.username;
            editUserPassword.value = ''; // Siempre vacía por seguridad
            editUserPassword.placeholder = 'Dejar en blanco para no cambiar la contraseña';
            editUserRole.value = userToEdit.role;

            // 🔒 NUEVA FUNCIONALIDAD: Verificar si es el último administrador
            const isLastAdmin = await checkIfLastAdmin(userToEdit.username, userToEdit.role);
            
            // Mostrar mensaje de ayuda si es el último administrador
            const editUserRoleHelp = document.getElementById('edit-user-role-help');
            if (editUserRoleHelp) {
                if (isLastAdmin) {
                    editUserRoleHelp.classList.remove('hidden');
                } else {
                    editUserRoleHelp.classList.add('hidden');
                }
            }
            
            // Renderizar los checkboxes de visibilidad para el modal
            const usersForCheckboxes = allUsers.filter(u => u.username !== username); // Excluir al propio usuario
            await renderVisibilityListsForEditModal(usersForCheckboxes, userToEdit.supervisedUsers || []);

            editUserModal.classList.remove('hidden');
            editUserModal.classList.add('flex');
        }
    }

    // Maneja el guardado de los cambios de un usuario editado desde el modal
    if (btnSaveEditedUser) {
        btnSaveEditedUser.addEventListener('click', async () => {
            const username = editUserUsername.value.trim();
            const password = editUserPassword.value.trim();
            const role = editUserRole.value;

            // 🔒 NUEVA VALIDACIÓN: Verificar que no se esté cambiando el último administrador a estándar
            if (editingUsername && role !== 'Administrador') {
                const canChangeToStandard = await checkIfCanChangeToStandard(editingUsername);
                if (!canChangeToStandard) {
                    showErrorMessageModal('Error de Validación', 'No se puede cambiar a usuario estándar: es el último administrador del sistema. Debe haber al menos un administrador activo.');
                    return;
                }
            }

            // Recoger usuarios con visibilidad desde la nueva interfaz
            const supervisedUsers = [];
            if (role !== 'Administrador' && supervisedUsersList) {
                supervisedUsersList.querySelectorAll('[data-username]').forEach(userDiv => {
                    supervisedUsers.push(userDiv.dataset.username);
                });
            }

            const userData = { username, password, role, supervisedUsers };
            const result = await window.api.saveUser(userData); // La función saveUser en main.js maneja la lógica de añadir/actualizar

            if (result.success) {
                showToast(result.message, 'success');
                closeEditUserModal();
                loadUsers(); // Recargar la tabla de usuarios
                await populateAssignedUsers(); // Actualizar los selects de asignación en la pantalla principal
            } else {
                showErrorMessageModal('Error al guardar usuario', `Error al guardar usuario: ${result.message}`);
            }
        });
    }

    // Cierra el modal de edición de usuarios
    if (btnCancelEditUser) {
        btnCancelEditUser.addEventListener('click', () => {
            closeEditUserModal();
        });
    }

    function closeEditUserModal() {
        editUserModal.classList.add('hidden');
        editUserModal.classList.remove('flex');
        editingUsername = null; // Reiniciar la variable de edición
        
        // Limpiar campos del modal
        editUserUsername.value = '';
        editUserPassword.value = '';
        editUserRole.value = 'Usuario';
        
        // Limpiar las nuevas listas
        if (availableUsersList) availableUsersList.innerHTML = '';
        if (supervisedUsersList) supervisedUsersList.innerHTML = '';
        
        // Limpiar filtros de búsqueda
        if (filterAvailableUsers) filterAvailableUsers.value = '';
        if (filterSupervisedUsers) filterSupervisedUsers.value = '';
        
        // Ocultar mensajes de ayuda
        const editUserRoleHelp = document.getElementById('edit-user-role-help');
        if (editUserRoleHelp) editUserRoleHelp.classList.add('hidden');
    }

    // 🔄 NUEVO: Cerrar modal de editar usuario al hacer clic fuera
    if (editUserModal) {
        editUserModal.addEventListener('click', (e) => {
            // Si se hace clic en el fondo del modal (no en el contenido)
            if (e.target === editUserModal) {
                closeEditUserModal();
            }
        });
    }


    // Modificado: Lógica de eliminación de usuario para usar el modal.
    async function deleteUser() {
        // Esta función ahora se llama cuando se confirma en el modal
        if (!USER_TO_DELETE_USERNAME) return; // Si no hay usuario a eliminar, salir

        const username = USER_TO_DELETE_USERNAME;

        const result = await window.api.deleteUser(username);
        if (result.success) {
            showToast(result.message, 'success');
            loadUsers(); // Recargar la tabla
            resetAddUserForm(); // Resetear el formulario de añadir
            closeEditUserModal(); // Asegurarse de cerrar el modal de edición si estaba abierto para este usuario
            await populateAssignedUsers(); // Actualizar los selects de asignación en la pantalla principal
        } else {
            showErrorMessageModal('Error al eliminar usuario', `Error al eliminar usuario: ${result.message}`);
        }
        closeDeleteConfirmModal(); // Siempre cerrar el modal después de la operación
        USER_TO_DELETE_USERNAME = null; // Resetear la variable
    }

    // Lógica para eliminar cuenta propia
    async function deleteOwnAccount() {
        // Esta función se llama cuando se confirma la eliminación de cuenta propia
        if (!USER_TO_DELETE_USERNAME) return; // Si no hay usuario a eliminar, salir

        // Verificar la confirmación de texto
        if (confirmDeleteText && confirmDeleteText.value.trim() !== 'ELIMINAR USUARIO') {
            showToast('Debes escribir exactamente "ELIMINAR USUARIO" para confirmar', 'error');
            return;
        }

        const username = USER_TO_DELETE_USERNAME;

        const result = await window.api.deleteOwnAccount(username);
        if (result.success) {
            showToast(result.message, 'success');
            closeDeleteConfirmModal(); // Cerrar el modal
            
            // Limpiar variables de sesión
            CURRENT_USER = null;
            CURRENT_USER_ROLE = null;
            
            // Ocultar el indicador de notificaciones
            if (notificationsIndicator) {
                notificationsIndicator.classList.add('hidden');
            }
            
            // Redirigir al inicio de sesión
            showLoginScreen();
            
            // Ocultar el botón de gestión de usuarios
            if (btnUserManagement) {
                btnUserManagement.classList.add('hidden');
            }
        } else {
            showErrorMessageModal('Error al eliminar cuenta', `Error al eliminar cuenta: ${result.message}`);
        }
        USER_TO_DELETE_USERNAME = null; // Resetear la variable
    }


    // -----------------------------------------------------------------------------
    // Lógica de Filtros de Usuarios
    // -----------------------------------------------------------------------------


    // Limpia el menú hamburguesa de gestión de usuarios
    function cleanupUserManagementHamburgerMenu() {
        const userManagementHamburgerButton = document.getElementById('hamburger-button-user-management');
        const userManagementHamburgerDropdown = document.getElementById('hamburger-dropdown-user-management');
        
        if (userManagementHamburgerDropdown) {
            userManagementHamburgerDropdown.classList.remove('show');
        }
        
        console.log('Menú hamburguesa de gestión de usuarios limpiado');
    }
    
    // Vuelve a la pantalla principal desde la gestión de usuarios
    async function showMainScreenFromUserManagement() {
        // 🔄 NUEVO: Registrar actividad del usuario
        await recordUserActivity();
        
        // Limpiar el menú hamburguesa antes de cambiar de pantalla
        cleanupUserManagementHamburgerMenu();
        
        if (screenUserManagement) screenUserManagement.classList.add('hidden');
        if (screenMain) screenMain.classList.remove('hidden');
        
        // Asegurarse de que el nombre del usuario se muestre correctamente
        if (currentUserEl && CURRENT_USER) {
            currentUserEl.textContent = CURRENT_USER;
        }
        if (chatUser && CURRENT_USER) {
            chatUser.textContent = CURRENT_USER;
        }
        
        // Asegurarse de que el botón de gestión de usuarios se muestre correctamente si el rol es admin
        if (btnUserManagement) {
            if (CURRENT_USER_ROLE === 'Administrador') {
                btnUserManagement.classList.remove('hidden'); // Debe estar visible si es admin
            } else {
                btnUserManagement.classList.add('hidden');
            }
        }
        
        // 🔄 NUEVO: Aplicar la vista actual al volver
        applyCurrentView();
        
        // Después de volver a la pantalla principal, es buena idea refrescar las tareas
        renderTasks();
        
        // Actualizar el indicador de notificaciones
        updateNotificationsIndicator();
        
        // 🔄 NUEVO: Actualizar también las notificaciones de la pantalla de gestión de usuarios
        updateNotificationsIndicatorUserManagement();
    }

    // --- Lógica de Inicio de Sesión ---
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const username = (loginUsername && loginUsername.value || '').trim();
            const password = (loginPassword && loginPassword.value || '').trim();

            if (!username || !password) {
                if (loginErrorMessage) {
                    loginErrorMessage.textContent = 'Por favor, introduce usuario y contraseña.';
                    loginErrorMessage.classList.remove('hidden');
                }
                return;
            }

            // Llamar a la función IPC para verificar credenciales
            const result = await window.api.verifyUserCredentials(username, password);

            if (result.success) {
                // 🔄 NUEVO: Registrar actividad del usuario al iniciar sesión
                await recordUserActivity();
                
                showMainScreen(result.user, result.role);
            } else {
                if (loginErrorMessage) {
                    loginErrorMessage.textContent = result.error || 'Usuario o contraseña incorrectos.';
                    loginErrorMessage.classList.remove('hidden');
                }
            }
        });

        // Permitir iniciar sesión con Enter en los campos de texto
        if (loginUsername) {
            loginUsername.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnLogin.click();
                }
            });
        }
        if (loginPassword) {
            loginPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnLogin.click();
                }
            });
        }
    }


    // Cierre de sesión
    console.log('Configurando botón de logout principal:', btnLogoutMain);
    if (btnLogoutMain) {
        console.log('Botón de logout principal encontrado, añadiendo event listener');
        btnLogoutMain.addEventListener('click', async () => {
            console.log('Botón "Cerrar Sesión" clickeado');
        
        try {
            // Marcar al usuario como offline antes de cerrar sesión
            if (CURRENT_USER) {
                try {
                    const allUsers = await window.api.getUsers();
                    const currentUserIndex = allUsers.findIndex(u => u.username === CURRENT_USER);
                    if (currentUserIndex !== -1) {
                        // Marcar como offline (última actividad hace más de 5 minutos)
                        const offlineTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutos atrás
                        allUsers[currentUserIndex].lastActivity = offlineTime.toISOString();
                        await window.api.writeUsers(allUsers);
                        console.log(`🔴 Usuario ${CURRENT_USER} marcado como offline al cerrar sesión`);
                    }
                } catch (error) {
                    console.error('Error al marcar usuario como offline al cerrar sesión:', error);
                }
            }
            
            // Detener monitoreo antes de cerrar sesión (si existe la función)
            if (typeof stopOnlineStatusMonitoring === 'function') {
                try {
                    stopOnlineStatusMonitoring();
                } catch (error) {
                    console.error('Error al detener monitoreo:', error);
                }
            }
            
            // Resetear variables de usuario
            CURRENT_USER = null;
            CURRENT_USER_ROLE = null;
            
            // Limpiar preferencias del usuario al cerrar sesión
            userPreferences = {};
            
            // Limpiar menús hamburguesa
            if (hamburgerDropdown) hamburgerDropdown.classList.remove('show');
            const hamburgerDropdownUserManagement = document.getElementById('hamburger-dropdown-user-management');
            if (hamburgerDropdownUserManagement) hamburgerDropdownUserManagement.classList.remove('show');
            
            // Ocultar todas las pantallas
            if (screenMain) screenMain.classList.add('hidden');
            if (screenUserManagement) screenUserManagement.classList.add('hidden');
            
            // Mostrar pantalla de login
            if (screenLogin) screenLogin.classList.remove('hidden');
            
            // Limpiar campos de login
            const loginUsername = document.getElementById('login-username');
            const loginPassword = document.getElementById('login-password');
            if (loginUsername) loginUsername.value = '';
            if (loginPassword) loginPassword.value = '';
            
            // Limpiar mensajes de error
            const loginErrorMessage = document.getElementById('login-error-message');
            if (loginErrorMessage) {
                loginErrorMessage.classList.add('hidden');
                loginErrorMessage.textContent = '';
            }
            
            // Ocultar el indicador de notificaciones
            if (notificationsIndicator) {
                notificationsIndicator.classList.add('hidden');
            }
            
            // Ocultar el botón de gestión de usuarios al cerrar sesión
            if (btnUserManagement) {
                btnUserManagement.classList.add('hidden');
            }
            
            // Limpiar caché de tareas y usuarios
            ALL_TASKS_CACHE = [];
            ALL_USERS_CACHE = [];
            
                    showToast('Sesión cerrada correctamente', 'success');
        
    } catch (error) {
        console.error('Error durante el cierre de sesión:', error);
        showToast('Error al cerrar sesión', 'error');
    }
        });
    } else {
        console.error('Botón de logout principal NO encontrado');
    }

    // Eliminar cuenta propia
    const btnDeleteOwnAccount = document.getElementById('btn-delete-own-account');
    if (btnDeleteOwnAccount) {
        btnDeleteOwnAccount.addEventListener('click', async () => {
            if (!CURRENT_USER) {
                showToast('No hay usuario conectado', 'error');
                return;
            }

            // Mostrar modal de confirmación
            showDeleteConfirmModal(CURRENT_USER, 'own-account');
        });
    }

    // Cambiar contraseña
    const btnChangePassword = document.getElementById('btn-change-password');
    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', () => {
            if (changePasswordModal) {
                changePasswordModal.classList.remove('hidden');
                changePasswordModal.classList.add('flex');
                // Limpiar campos
                if (newPasswordInput) newPasswordInput.value = '';
                if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
                // Inicializar botón en estado deshabilitado
                if (btnSaveNewPassword) {
                    btnSaveNewPassword.disabled = true;
                    btnSaveNewPassword.classList.add('btn-disabled');
                    btnSaveNewPassword.classList.remove('hover:bg-amber-700');
                }
            }
        });
    }

    // Event Listeners para la navegación de la gestión de usuarios
    if (btnUserManagement) {
        btnUserManagement.addEventListener('click', showUserManagementScreen);
    }
    
    // Event Listeners para el menú hamburguesa
    console.log('Configurando menú hamburguesa principal:', hamburgerButton, hamburgerDropdown);
    if (hamburgerButton && hamburgerDropdown) {
        console.log('Menú hamburguesa principal encontrado, añadiendo event listener');
        hamburgerButton.addEventListener('click', () => {
            console.log('Botón hamburguesa clickeado, toggle del menú');
            hamburgerDropdown.classList.toggle('show');
        });
    } else {
        console.error('Menú hamburguesa principal NO encontrado');
    }
    
    // Cerrar menú hamburguesa al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!hamburgerButton.contains(e.target) && !hamburgerDropdown.contains(e.target)) {
            hamburgerDropdown.classList.remove('show');
        }
    });
    
    // Event listener para el botón de ayuda
    if (btnHelp) {
        btnHelp.addEventListener('click', showHelpModal);
    }
    
    // Event listener para cerrar el modal de ayuda
    if (btnCloseHelpModal) {
        btnCloseHelpModal.addEventListener('click', closeHelpModal);
    }

    if (btnBackToMain) { // Botón de "Volver a Tareas" en la pantalla de gestión de usuarios
        btnBackToMain.addEventListener('click', showMainScreenFromUserManagement);
    }

    // Event listener para el modal de información del usuario
    if (currentUserEl) {
        currentUserEl.addEventListener('click', showUserInfoModal);
    }

    if (btnCloseUserInfoModal) {
        btnCloseUserInfoModal.addEventListener('click', closeUserInfoModal);
    }


    // Event listener para alternar entre vista de tarjetas y tabla
    if (btnToggleView) {
        btnToggleView.addEventListener('click', toggleViewMode);
    }

    // Mantener coherencia del checkbox de privacidad cuando cambia el asignado (creación)
    if (newAssignedTo) {
        newAssignedTo.addEventListener('change', () => {
            updateNewPrivateAvailability();
        });
    }

    // Create task
    if (btnCreate) {
        btnCreate.addEventListener('click', async () => {
            // 🔄 NUEVO: Registrar actividad del usuario
            await recordUserActivity();
            
            if (!CURRENT_USER) { showToast('Inicia sesión para crear tareas', 'info'); return; } // Mensaje actualizado
            const title = (newTitle && newTitle.value || '').trim();
            if (!title) { showToast('El título no puede estar vacío', 'error'); return; }
            const assignedTo = newAssignedTo && newAssignedTo.value ? normalizeUsername(newAssignedTo.value) : CURRENT_USER;
            if (!assignedTo) { showToast('Debe asignar la tarea a un usuario', 'error'); return; }
            // Solo permitir tarea privada si está asignada a mí mismo
            const isAssignedToSelf = !!CURRENT_USER && assignedTo && assignedTo.toLowerCase() === CURRENT_USER.toLowerCase();
            const isPrivate = isAssignedToSelf && newPrivate && newPrivate.checked ? true : false;

            const task = {
                id: genId(),
                title,
                desc: (newDesc && newDesc.value) || '',
                priority: (newPriority && newPriority.value) || 'Media',
                state: 'Sin iniciar',
                createdBy: CURRENT_USER,
                createdAt: new Date().toISOString(),
                ocupado: null,
                chat: [],
                lastModified: new Date().toISOString(),
                assignedTo: assignedTo,
                private: isPrivate
            };


            task.chat.push({ type: 'system', message: `[${CURRENT_USER}] Tarea creada.`, date: new Date().toISOString() });
            if (assignedTo) { task.chat.push({ type: 'system', message: `[${CURRENT_USER}] Asignada a: ${assignedTo}`, date: new Date().toISOString() }); }
            if (isPrivate) { task.chat.push({ type: 'system', message: `[${CURRENT_USER}] Esta tarea es privada.`, date: new Date().toISOString() }); }

            // Inicializar notificaciones para el usuario actual
            task.notifications = {};
            task.notifications[CURRENT_USER] = task.chat.length;

            await saveTaskObj(task, true);
            
            // Notificar a otros usuarios si la tarea no es privada
            if (!isPrivate && assignedTo && assignedTo !== CURRENT_USER) {
                // Solo actualizar el contador de notificaciones para otros usuarios
                // (se marcará como no leído hasta que abran la tarea)
                // No agregar mensajes automáticos al historial del chat
            }
            if (newTitle) newTitle.value = '';
            if (newDesc) newDesc.value = '';
            if (newPriority) newPriority.value = 'Media';
            if (newAssignedTo) newAssignedTo.value = '';
            if (newPrivate) newPrivate.checked = false;
            updateNewPrivateAvailability();

            // Refrescar combos por si han cambiado usuarios/visibilidad y forzar filtro
            await populateAssignedUsers();
            if (filterAssignedTo) {
                filterAssignedTo.value = CURRENT_USER;
                filterAssignedTo.dataset.initialized = 'true';
            }

            await renderTasks();
            showToast('Tarea creada', 'success');
        });
    }

    // Filters listeners
    if (filterText) filterText.addEventListener('input', renderTasks);
    if (filterState) filterState.addEventListener('change', renderTasks);
    if (filterPriority) filterPriority.addEventListener('change', renderTasks);
    if (filterAssignedTo) filterAssignedTo.addEventListener('change', renderTasks);
    if (btnResetFilters) btnResetFilters.addEventListener('click', () => {
        if (filterText) filterText.value = '';
        if (filterState) filterState.value = 'OPEN_TASKS';
        if (filterPriority) filterPriority.value = '';
        if (filterAssignedTo) filterAssignedTo.value = CURRENT_USER;
        renderTasks();
    });

    // Modal open
    async function openTask(id) {
        // Evitar abrir detalles si el modal de confirmación de eliminación está visible
        if (deleteConfirmModal && !deleteConfirmModal.classList.contains('hidden')) {
            return;
        }
        // 🔄 NUEVO: Registrar actividad del usuario
        await recordUserActivity();
        
        const task = loadTaskObj(id);
        if (!task) { showToast('Tarea no encontrada', 'error'); return; }
        OPEN_TASK_ID = id;
        
        // 🔄 NUEVO: Resetear hash del chat para la nueva tarea
        resetChatHash();
        
        // 🔒 MEJORA: Restricción de permisos para TODOS los usuarios (incluyendo administradores)
        // 🔄 NUEVO: Sistema de edición colaborativa - no hay bloqueos
        // Todos los usuarios pueden editar simultáneamente

        if (modalTitle) modalTitle.textContent = task.title;
        if (editTitle) editTitle.value = task.title;
        if (editDesc) editDesc.value = task.desc || '';
        if (editPriority) editPriority.value = task.priority || 'Media';
        if (editState) editState.value = task.state || 'Sin iniciar';
        if (editAssignedTo) editAssignedTo.value = task.assignedTo || task.createdBy;
        if (editPrivate) editPrivate.checked = task.private || false;
        updateEditPrivateAvailability();

        // 🔒 NUEVA FUNCIONALIDAD: Restringir checkbox de privacidad
        // Solo el creador puede hacer privada una tarea si está asignada a sí mismo
        if (editPrivate) {
            const canMakePrivate = task.createdBy === CURRENT_USER && 
                                 (task.assignedTo === CURRENT_USER || !task.assignedTo);
            
            editPrivate.disabled = !canMakePrivate;
            editPrivate.title = canMakePrivate 
                ? 'Marcar para hacer esta tarea privada (solo visible para ti)'
                : 'Solo puedes hacer privada una tarea si eres el creador y está asignada a ti mismo';
            
            // Aplicar estilos visuales para indicar el estado
            if (canMakePrivate) {
                editPrivate.classList.remove('opacity-50', 'cursor-not-allowed');
                editPrivate.classList.add('cursor-pointer');
            } else {
                editPrivate.classList.add('opacity-50', 'cursor-not-allowed');
                editPrivate.classList.remove('cursor-pointer');
            }
            
            // Mostrar/ocultar mensaje de ayuda
            const editPrivateHelp = document.getElementById('edit-private-help');
            if (editPrivateHelp) {
                if (canMakePrivate) {
                    editPrivateHelp.classList.add('hidden');
                } else {
                    editPrivateHelp.classList.remove('hidden');
                }
            }
        }

        if (stateCommentBox) stateCommentBox.classList.add('hidden');
        if (stateComment) stateComment.value = '';
        
        // 🔄 NUEVO: Sistema de edición colaborativa - siempre editable
        setModalEditable(true);
        renderChat(task.chat || []);
        
        // Marcar la tarea como leída para el usuario actual
        markTaskAsRead(id, CURRENT_USER);
        
        // 🔄 NUEVO: Iniciar monitoreo del chat en tiempo real
        startChatMonitoring();
        
        if (modal) { modal.classList.remove('hidden'); setTimeout(() => modal.classList.add('flex'), 10); }
    }

    function setModalEditable(flag) {
        // 🔄 NUEVO: Sistema de edición colaborativa - siempre editable
        const leftSideElements = [editTitle, editDesc, editPriority, editState, stateComment, editAssignedTo];
        const chatElements = [chatInput, chatSend];
        
        // 🔄 NUEVO: Botón de guardar siempre habilitado
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.classList.remove('opacity-50', 'cursor-not-allowed');
            btnSave.classList.add('cursor-pointer');
        }
        
        // 🔄 NUEVO: Todos los elementos siempre editables
        leftSideElements.forEach(el => {
            if (!el) return;
            el.disabled = false;
            el.classList.remove('opacity-50');
        });
        
        // 🔄 NUEVO: Chat siempre editable
        chatElements.forEach(el => {
            if (!el) return;
            el.disabled = false;
            el.classList.remove('opacity-50');
        });
        
        // 🔄 NUEVO: Ocultar indicador de chat habilitado (no es necesario)
        const chatStatusIndicator = document.getElementById('chat-status-indicator');
        if (chatStatusIndicator) {
            chatStatusIndicator.classList.add('hidden');
        }
        
        // 🔄 NUEVO: Checkbox de privacidad siempre habilitado si es posible
        updateEditPrivateAvailability();
    }

    if (editState) editState.addEventListener('change', () => { if (stateCommentBox) stateCommentBox.classList.remove('hidden'); });

    if (btnSave) btnSave.addEventListener('click', async () => {
        // 🔄 NUEVO: Registrar actividad del usuario
        await recordUserActivity();
        
        if (!OPEN_TASK_ID) return;
        const task = loadTaskObj(OPEN_TASK_ID);
        if (!task) return;


        const prev = { title: task.title, desc: task.desc, priority: task.priority, state: task.state, assignedTo: task.assignedTo, private: task.private };
        const now = new Date().toISOString();
        let hasChanges = false;

        if (editTitle && editTitle.value.trim() !== prev.title) {
            task.title = editTitle.value.trim();
            task.chat.push({ type: 'system', message: `[${CURRENT_USER}] Título cambiado: "${task.title}"`, date: now });
            hasChanges = true;
        }
        if (editDesc && editDesc.value.trim() !== (prev.desc || '')) {
            task.desc = editDesc.value.trim();
            task.chat.push({ type: 'system', message: `[${CURRENT_USER}] Descripción cambiada.`, date: now });
            hasChanges = true;
        }
        if (editPriority && editPriority.value !== prev.priority) {
            task.priority = editPriority.value;
            task.chat.push({ type: 'system', message: `[${CURRENT_USER}] Prioridad cambiada a: ${task.priority}`, date: now });
            hasChanges = true;
        }
        if (editState && editState.value !== prev.state) {
            const comment = (stateComment && stateComment.value || '').trim();
            task.state = editState.value;
            const msg = `[${CURRENT_USER}] Estado: ${prev.state} → ${task.state}` + (comment ? ` — Comentario: ${comment}` : '');
            task.chat.push({ type: 'system', message: msg, date: now });
            hasChanges = true;
        }

        const newAssignedToValue = editAssignedTo && editAssignedTo.value ? normalizeUsername(editAssignedTo.value) : task.createdBy;
        if (!newAssignedToValue) {
            showToast('Debe asignar la tarea a un usuario', 'error');
            return;
        }
        if (newAssignedToValue !== (prev.assignedTo || '')) {
            // Si la tarea es privada, no permitir reasignar fuera de mí mismo
            const wouldAssignToSelf = !!CURRENT_USER && newAssignedToValue.toLowerCase() === CURRENT_USER.toLowerCase();
            if (task.private && !wouldAssignToSelf) {
                showToast('No puedes reasignar una tarea privada a otro usuario. Ponla pública o quita la privacidad antes.', 'error');
                // Revertir selección en UI
                if (editAssignedTo) editAssignedTo.value = prev.assignedTo || task.createdBy;
                updateEditPrivateAvailability();
                return;
            }

            task.assignedTo = newAssignedToValue;
            const msg = `[${CURRENT_USER}] Asignado a: ${newAssignedToValue}`;
            task.chat.push({ type: 'system', message: msg, date: now });
            hasChanges = true;
        }

        const newPrivateValue = (editPrivate && editPrivate.checked) || false;
        if (newPrivateValue !== (prev.private || false)) {
            // 🔒 NUEVA VALIDACIÓN: Verificar que se pueda cambiar la privacidad
            const canMakePrivate = task.createdBy === CURRENT_USER && (task.assignedTo === CURRENT_USER || !task.assignedTo);
            
            if (newPrivateValue && !canMakePrivate) {
                showToast('No se puede hacer privada esta tarea: solo el creador puede hacer privada una tarea si está asignada a sí mismo', 'error');
                // Revertir el cambio en la UI
                if (editPrivate) editPrivate.checked = false;
                return;
            }
            
            task.private = newPrivateValue;
            const msg = newPrivateValue ? `[${CURRENT_USER}] Configurada como privada.` : `[${CURRENT_USER}] Configurada como pública.`;
            task.chat.push({ type: 'system', message: msg, date: now });
            hasChanges = true;
            updateEditPrivateAvailability();
        }

        if (hasChanges) {
            // Notificar cambios importantes a otros usuarios (NO al usuario actual)
            if (prev.assignedTo !== task.assignedTo) {
                if (task.assignedTo && task.assignedTo !== CURRENT_USER) {
                    // Solo notificar si hay un usuario asignado diferente al actual
                    notifyAllUsersExcept(OPEN_TASK_ID, CURRENT_USER, `[${CURRENT_USER}] Tarea "${task.title}" asignada a: ${task.assignedTo}`);
                }
            }
            
            if (prev.priority !== task.priority) {
                notifyAllUsersExcept(OPEN_TASK_ID, CURRENT_USER, `[${CURRENT_USER}] Prioridad de tarea "${task.title}" cambiada a: ${task.priority}`);
            }
            
            if (prev.state !== task.state) {
                notifyAllUsersExcept(OPEN_TASK_ID, CURRENT_USER, `[${CURRENT_USER}] Estado de tarea "${task.title}" cambiado a: ${task.state}`);
            }
            
            await saveTaskObj(task, true);
        } else {
            await saveTaskObj(task, false);
        }

        renderTasks();
        showToast('Cambios guardados', 'success');
        if (stateCommentBox) stateCommentBox.classList.add('hidden');
        if (stateComment) stateComment.value = '';
        if (modalTitle) modalTitle.textContent = task.title;
        renderChat(task.chat || []);
    });


    // Close modal: auto-release if current user
    if (closeModal) closeModal.addEventListener('click', async () => {
        // 🔄 NUEVO: Detener monitoreo del chat al cerrar el modal
        stopChatMonitoring();
        
        // 🔄 NUEVO: Marcar tarea como leída al cerrar
        if (OPEN_TASK_ID) {
            const task = loadTaskObj(OPEN_TASK_ID);
            if (task) {
                // Asegurar que las notificaciones estén marcadas como vistas
                markTaskAsRead(OPEN_TASK_ID, CURRENT_USER);
            }
        }
        
        // 🔄 NUEVO: Registrar actividad del usuario al cerrar tarea
        await recordUserActivity();
        
        OPEN_TASK_ID = null;
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    });

    // 🔄 NUEVO: Cerrar modal al hacer clic fuera del contenido
    if (modal) {
        modal.addEventListener('click', async (e) => {
            // Si se hace clic en el fondo del modal (no en el contenido)
            if (e.target === modal) {
                // 🔄 NUEVO: Detener monitoreo del chat al cerrar el modal
                stopChatMonitoring();
                
                // 🔄 NUEVO: Marcar tarea como leída al cerrar
                if (OPEN_TASK_ID) {
                    const task = loadTaskObj(OPEN_TASK_ID);
                    if (task) {
                        // Asegurar que las notificaciones estén marcadas como vistas
                        markTaskAsRead(OPEN_TASK_ID, CURRENT_USER);
                    }
                }
                
                // 🔄 NUEVO: Registrar actividad del usuario al cerrar tarea
                await recordUserActivity();
                
                OPEN_TASK_ID = null;
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    }

    // Chat
    function renderChat(chat) {
        if (!chatBox) return;
        chatBox.innerHTML = '';
        
        const task = OPEN_TASK_ID ? loadTaskObj(OPEN_TASK_ID) : null;
        const userNotifications = task && task.notifications ? task.notifications[CURRENT_USER] || 0 : 0;
        

        
        (chat || []).forEach((m, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'mb-3';
            
            // Determinar si el mensaje es nuevo para el usuario actual
            // Solo mostrar "(nuevo)" si el mensaje es posterior a la última vez que el usuario vio la tarea
            // Y NO mostrar "(nuevo)" para mensajes del sistema que el usuario actual creó
            let isNew = false;
            if (m.type === 'system') {
                // Para mensajes del sistema, verificar si el usuario actual los creó
                const isCurrentUserMessage = m.message && m.message.includes(`[${CURRENT_USER}]`);
                isNew = !isCurrentUserMessage && index >= userNotifications;
            } else if (m.type === 'user') {
                // Para mensajes de usuario, solo mostrar "(nuevo)" si no es del usuario actual
                isNew = m.user !== CURRENT_USER && index >= userNotifications;
            }
            
            const newBadge = isNew ? '<span class="inline-block bg-amber-500 text-white text-xs px-2 py-1 rounded-full ml-2">(nuevo)</span>' : '';
            
            if (m.type === 'system') {
                wrapper.innerHTML = `<em class="system text-sm">${escapeHtml(m.message)} <span class=\"text-xs text-slate-500\">(${new Date(m.date).toLocaleString()})</span>${newBadge}</em>`;
            } else if (m.type === 'user') {
                const mine = m.user === CURRENT_USER;
                wrapper.innerHTML = `<div class="flex ${mine ? 'justify-end' : 'justify-start'}"><div class="max-w-[85%] p-3 rounded-xl ${mine ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-200'}"><div class="text-xs font-semibold ${mine ? 'text-indigo-200' : 'text-amber-200'}">${escapeHtml(m.user)} <span class=\"text-xs text-slate-400\">· ${new Date(m.date).toLocaleString()}</span>${newBadge}</div><div class="mt-1 text-sm">${escapeHtml(m.message)}</div></div></div>`;
            }
            chatBox.appendChild(wrapper);
        });
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function sendChat() {
        // 🔄 NUEVO: Registrar actividad del usuario
        await recordUserActivity();
        
        if (!OPEN_TASK_ID) return;
        const txt = (chatInput && chatInput.value || '').trim();
        if (!txt) return;
        const task = loadTaskObj(OPEN_TASK_ID);
        if (!task) return;
        

        
        const msg = { type: 'user', user: CURRENT_USER, message: txt, date: new Date().toISOString() };
        task.chat.push(msg);
        
        // El mensaje ya está en el chat, solo necesitamos que se marque como no leído para otros usuarios
        // No agregar mensajes automáticos al historial
        
        await saveTaskObj(task, true);
        if (chatInput) chatInput.value = '';
        renderChat(task.chat);
        renderTasks();
        
        // 🔄 NUEVO: Resetear el hash del chat para evitar conflictos
        resetChatHash();
    }

    if (chatSend) chatSend.addEventListener('click', () => { sendChat(); });
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });

    // Lógica para mostrar el modal de confirmación de eliminación (ahora genérico)
    // Modificado: Se añade un parámetro 'type' para distinguir entre tarea y usuario
    async function showDeleteConfirmModal(idOrUsername, type) {
        // Asegurarse de ocultar los botones de "Entendido" si estaban visibles
        if (deleteConfirmModalActions) deleteConfirmModalActions.classList.remove('hidden');
        if (btnCloseErrorModal) btnCloseErrorModal.classList.add('hidden');
        
        // Ocultar el campo de confirmación de texto por defecto
        if (deleteConfirmTextInput) deleteConfirmTextInput.classList.add('hidden');
        if (confirmDeleteText) confirmDeleteText.value = '';

        if (type === 'task') {
            TASK_TO_DELETE_ID = idOrUsername;
            if (deleteConfirmModalTitle) deleteConfirmModalTitle.textContent = 'Confirmar Eliminación de Tarea';
            if (deleteConfirmModalMessage) deleteConfirmModalMessage.textContent = '¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.';
            // Asegurarse de que el listener de confirmación apunte a confirmAndDeleteTask
            btnDeleteConfirm.removeEventListener('click', deleteUser); // Eliminar el listener anterior si existiera
            btnDeleteConfirm.addEventListener('click', confirmAndDeleteTask);
        } else if (type === 'user') {
            USER_TO_DELETE_USERNAME = idOrUsername;
            
            // 🔄 NUEVO: Mostrar indicador de verificación en progreso
            if (deleteConfirmModalTitle) deleteConfirmModalTitle.textContent = 'Verificando Estado del Usuario...';
            if (deleteConfirmModalMessage) deleteConfirmModalMessage.textContent = `Verificando si el usuario "${idOrUsername}" está realmente offline antes de proceder con la eliminación...`;
            
            // Mostrar el modal con el mensaje de verificación
            if (deleteConfirmModal) {
                deleteConfirmModal.classList.remove('hidden');
                deleteConfirmModal.classList.add('flex');
            }
            
            // Ocultar botones de acción durante la verificación
            if (deleteConfirmModalActions) deleteConfirmModalActions.classList.add('hidden');
            if (btnCloseErrorModal) btnCloseErrorModal.classList.add('hidden');
            
            // 🔒 NUEVA FUNCIONALIDAD: Verificación ULTRA RÁPIDA al momento de eliminar
            // Esta verificación se ejecuta INMEDIATAMENTE antes de permitir la eliminación
            let isUserOnline = false;
            try {
                console.log(`🔍 VERIFICACIÓN ULTRA RÁPIDA para usuario: ${idOrUsername}`);
                console.log(`🔍 Ejecutando verificación INMEDIATA sin depender del estado en pantalla`);
                
                // 🔄 NUEVO: Verificación ULTRA RÁPIDA - solo 2 segundos de timeout
                const verificationPromise = checkUserOnlineStatusRealTime(idOrUsername);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout en verificación ultra rápida')), 2000) // 2 segundos
                );
                
                isUserOnline = await Promise.race([verificationPromise, timeoutPromise]);
                console.log(`🔍 RESULTADO ULTRA RÁPIDO: ${isUserOnline ? '🟢 ONLINE - BLOQUEAR ELIMINACIÓN' : '🔴 OFFLINE - PERMITIR ELIMINACIÓN'}`);
            } catch (error) {
                console.warn('Verificación ultra rápida con timeout, asumiendo usuario online por seguridad:', error);
                isUserOnline = true; // Por seguridad, asumir que está online
            }
            
            // 🔄 NUEVO: Actualizar la interfaz después de la verificación en tiempo real
            // para mostrar el estado más reciente
            await loadUsers();
            
            if (isUserOnline) {
                // Usuario está online, mostrar error
                if (deleteConfirmModalTitle) deleteConfirmModalTitle.textContent = 'Error: Usuario Recientemente Activo';
                if (deleteConfirmModalMessage) deleteConfirmModalMessage.textContent = `No se puede eliminar al usuario "${idOrUsername}" porque ha estado conectado recientemente. Por seguridad, solo se pueden eliminar usuarios que hayan estado desconectados por más de 2 minutos.`;
                
                // Mostrar mensaje informativo
                const deleteConfirmModalInfo = document.getElementById('delete-confirm-modal-info');
                if (deleteConfirmModalInfo) deleteConfirmModalInfo.classList.remove('hidden');
                
                // Ocultar botones de acción y mostrar solo el botón de cerrar
                if (deleteConfirmModalActions) deleteConfirmModalActions.classList.add('hidden');
                if (btnCloseErrorModal) btnCloseErrorModal.classList.remove('hidden');
                
                
                
                // No agregar event listener para eliminar
                return;
            } else {
                // Usuario está offline, proceder normalmente
                if (deleteConfirmModalTitle) deleteConfirmModalTitle.textContent = 'Confirmar Eliminación de Usuario';
                if (deleteConfirmModalMessage) deleteConfirmModalMessage.textContent = `¿Estás seguro de que quieres eliminar al usuario "${idOrUsername}"? Sus tareas serán reasignadas a sus creadores. Esta acción no se puede deshacer.`;
                
                // Ocultar mensaje informativo
                const deleteConfirmModalInfo = document.getElementById('delete-confirm-modal-info');
                if (deleteConfirmModalInfo) deleteConfirmModalInfo.classList.add('hidden');
                
                // Ocultar información adicional
                const additionalInfo = document.getElementById('delete-confirm-modal-additional-info');
                if (additionalInfo) additionalInfo.classList.add('hidden');
                
                // Mostrar botones de acción normales
                if (deleteConfirmModalActions) deleteConfirmModalActions.classList.remove('hidden');
                if (btnCloseErrorModal) btnCloseErrorModal.classList.add('hidden');
                
                // Asegurarse de que el listener de confirmación apunte a deleteUser
                btnDeleteConfirm.removeEventListener('click', confirmAndDeleteTask); // Eliminar el listener anterior
                btnDeleteConfirm.addEventListener('click', deleteUser);
            }
        } else if (type === 'own-account') {
            USER_TO_DELETE_USERNAME = idOrUsername;
            if (deleteConfirmModalTitle) deleteConfirmModalTitle.textContent = 'Confirmar Eliminación de Cuenta';
            if (deleteConfirmModalMessage) deleteConfirmModalMessage.textContent = `¿Estás seguro de que quieres eliminar tu cuenta "${idOrUsername}"? Tus tareas serán reasignadas a sus creadores. Esta acción no se puede deshacer y serás redirigido al inicio de sesión.`;
            
            // Mostrar el campo de confirmación de texto para auto-eliminación
            if (deleteConfirmTextInput) deleteConfirmTextInput.classList.remove('hidden');
            
            // Asegurarse de que el listener de confirmación apunte a deleteOwnAccount
            btnDeleteConfirm.removeEventListener('click', confirmAndDeleteTask); // Eliminar el listener anterior
            btnDeleteConfirm.removeEventListener('click', deleteUser); // Eliminar el listener anterior
            btnDeleteConfirm.addEventListener('click', deleteOwnAccount);
        }

        if (deleteConfirmModal) {
            deleteConfirmModal.classList.remove('hidden');
            deleteConfirmModal.classList.add('flex');
        }
    }


    // Lógica para eliminar tarea (ejecutada cuando se confirma en el modal)
    async function confirmAndDeleteTask() {
        if (TASK_TO_DELETE_ID) {
            await removeTaskObj(TASK_TO_DELETE_ID);
            renderTasks();
            showToast('Tarea eliminada', 'success');
            closeDeleteConfirmModal();
            TASK_TO_DELETE_ID = null;
        }
    }

    // Lógica para cerrar el modal de confirmación de eliminación
    function closeDeleteConfirmModal() {
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.add('hidden');
            deleteConfirmModal.classList.remove('flex');
            // Al cerrar el modal de confirmación, restaurar el estado por defecto si es necesario para futuras aperturas
            if (deleteConfirmModalActions) deleteConfirmModalActions.classList.remove('hidden');
            if (btnCloseErrorModal) btnCloseErrorModal.classList.add('hidden');
            
            // Ocultar mensaje informativo
            const deleteConfirmModalInfo = document.getElementById('delete-confirm-modal-info');
            if (deleteConfirmModalInfo) deleteConfirmModalInfo.classList.add('hidden');
        }
    }

    // Los event listeners para los botones del modal de confirmación ya no se definen aquí,
    // sino dinámicamente en showDeleteConfirmModal para manejar si es tarea o usuario.
    // if (btnDeleteConfirm) {
    //    btnDeleteConfirm.addEventListener('click', confirmAndDeleteTask); // Este será asignado dinámicamente ahora
    // }

    if (btnDeleteCancel) {
        btnDeleteCancel.addEventListener('click', closeDeleteConfirmModal);
    }

    // Event listener para confirmar con Enter en el campo de texto de auto-eliminación
    if (confirmDeleteText) {
        confirmDeleteText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                deleteOwnAccount();
            }
        });
    }

    // Event listener para el indicador de notificaciones
    if (notificationsIndicator) {
        notificationsIndicator.addEventListener('click', () => {
            // Marcar todas las notificaciones como leídas
            const allTasks = ALL_TASKS_CACHE;
            allTasks.forEach(task => {
                if (hasUnreadNotifications(task, CURRENT_USER)) {
                    markTaskAsRead(task.id, CURRENT_USER);
                }
            });
            
            // Actualizar la interfaz
            renderTasks();
            showToast('Todas las notificaciones marcadas como leídas', 'success');
        });
        
        // Agregar cursor pointer para indicar que es clickeable
        notificationsIndicator.style.cursor = 'pointer';
        notificationsIndicator.title = 'Haz clic para marcar todas como leídas';
        
        // Agregar efecto de pulsación
        notificationsIndicator.addEventListener('mousedown', () => {
            notificationsIndicator.style.transform = 'scale(0.95)';
        });
        
        notificationsIndicator.addEventListener('mouseup', () => {
            notificationsIndicator.style.transform = 'scale(1.05)';
        });
        
        notificationsIndicator.addEventListener('mouseleave', () => {
            notificationsIndicator.style.transform = 'scale(1)';
        });
        
        // Agregar efecto de hover con tooltip
        notificationsIndicator.addEventListener('mouseenter', () => {
            notificationsIndicator.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
        });
        
        notificationsIndicator.addEventListener('mouseleave', () => {
            notificationsIndicator.style.backgroundColor = 'transparent';
        });
        
        // Agregar efecto de click con feedback visual
        notificationsIndicator.addEventListener('click', () => {
            // Agregar efecto de "pulsación" al hacer clic
            notificationsIndicator.style.transform = 'scale(0.9)';
            setTimeout(() => {
                notificationsIndicator.style.transform = 'scale(1)';
            }, 150);
        });
        
        // Agregar efecto de "shake" cuando hay notificaciones nuevas
        function addNotificationShake() {
            notificationsIndicator.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                notificationsIndicator.style.animation = '';
            }, 500);
        }
        
        // Aplicar shake cuando se detecten nuevas notificaciones
        if (ALL_TASKS_CACHE.length > 0 && getUnreadCount(ALL_TASKS_CACHE[0], CURRENT_USER) > 0) {
            addNotificationShake();
        }
        
        // Función para aplicar shake cuando lleguen nuevas notificaciones
        window.addNotificationShake = addNotificationShake;
    }

    // Event listeners para el modal de cambiar contraseña
    if (btnSaveNewPassword) {
        btnSaveNewPassword.addEventListener('click', async () => {
            const newPassword = newPasswordInput?.value?.trim();
            const confirmPassword = confirmNewPasswordInput?.value?.trim();
            
            if (!newPassword) {
                showToast('La nueva contraseña no puede estar vacía', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (newPassword.length < 3) {
                showToast('La contraseña debe tener al menos 3 caracteres', 'error');
                return;
            }
            
            try {
                // Cargar usuarios actuales
                const users = await loadAllUsers();
                const userIndex = users.findIndex(u => u.username === CURRENT_USER);
                
                if (userIndex === -1) {
                    showToast('Usuario no encontrado', 'error');
                    return;
                }
                
                // Actualizar contraseña usando la función saveUser que maneja el hashing
                const userData = {
                    username: CURRENT_USER,
                    password: newPassword,
                    role: users[userIndex].role,
                    supervisedUsers: users[userIndex].supervisedUsers || []
                };
                
                const result = await window.api.saveUser(userData);
                
                if (result.success) {
                    showToast('Contraseña cambiada exitosamente', 'success');
                    // Actualizar el caché local
                    ALL_USERS_CACHE = await loadAllUsers();
                    closeChangePasswordModal();
                } else {
                    showToast(`Error al cambiar la contraseña: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('Error al cambiar contraseña:', error);
                showToast('Error al cambiar la contraseña', 'error');
            }
        });
    }
    
    if (btnCancelChangePassword) {
        btnCancelChangePassword.addEventListener('click', closeChangePasswordModal);
    }
    
    // Event listeners para el modal de crear nuevo usuario
    if (newUserLink) {
        newUserLink.addEventListener('click', showNewUserModal);
    }
    
    if (btnCancelNewUser) {
        btnCancelNewUser.addEventListener('click', closeNewUserModal);
    }
    
    if (btnSaveNewUser) {
        btnSaveNewUser.addEventListener('click', async () => {
            const username = newUserUsername?.value?.trim();
            const password = newUserPassword?.value?.trim();
            const confirmPassword = newUserConfirmPassword?.value?.trim();
            
            if (!username || !password || !confirmPassword) {
                showToast('Por favor, completa todos los campos', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (password.length < 3) {
                showToast('La contraseña debe tener al menos 3 caracteres', 'error');
                return;
            }
            
            // Verificar si el usuario ya existe
            const allUsers = await window.api.getUsers();
            const userExists = allUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
            
            if (userExists) {
                showToast('El nombre de usuario ya existe', 'error');
                return;
            }
            
            // Crear el usuario con rol "Estándar" por defecto
            const userData = { 
                username, 
                password, 
                role: 'Usuario', // Rol Estándar
                supervisedUsers: [] 
            };
            
            const result = await window.api.saveUser(userData);
            
            if (result.success) {
                closeNewUserModal();
                showUserCreatedSuccessModal();
                showToast('Usuario creado con éxito', 'success');
            } else {
                showToast(`Error al crear usuario: ${result.message}`, 'error');
            }
        });
    }
    
    // Validación en tiempo real para los campos del modal de nuevo usuario
    if (newUserUsername) {
        newUserUsername.addEventListener('input', () => {
            const username = newUserUsername.value.trim();
            const password = newUserPassword?.value?.trim();
            const confirmPassword = newUserConfirmPassword?.value?.trim();
            
            // Limpiar clases de validación anteriores
            newUserUsername.classList.remove('border-rose-500', 'border-emerald-500', 'border-slate-600');
            
            if (username.length === 0) {
                newUserUsername.classList.add('border-slate-600');
            } else {
                newUserUsername.classList.add('border-emerald-500');
            }
            
            // Controlar el estado del botón
            updateNewUserButtonState(username, password, confirmPassword);
        });
    }
    
    if (newUserPassword) {
        newUserPassword.addEventListener('input', () => {
            const username = newUserUsername?.value?.trim();
            const password = newUserPassword.value.trim();
            const confirmPassword = newUserConfirmPassword?.value?.trim();
            
            // Limpiar clases de validación anteriores
            newUserPassword.classList.remove('border-rose-500', 'border-emerald-500', 'border-slate-600');
            
            // Actualizar mensaje de ayuda
            if (newUserPasswordHelp) {
                if (password.length === 0) {
                    newUserPasswordHelp.textContent = 'La contraseña debe tener al menos 3 caracteres';
                    newUserPasswordHelp.className = 'text-xs mt-1 text-slate-400';
                    newUserPassword.classList.add('border-slate-600');
                } else if (password.length < 3) {
                    newUserPasswordHelp.textContent = `Muy corta (${password.length}/3 caracteres)`;
                    newUserPasswordHelp.className = 'text-xs mt-1 text-rose-400';
                    newUserPassword.classList.add('border-rose-500');
                } else {
                    newUserPasswordHelp.textContent = `Perfecta (${password.length} caracteres)`;
                    newUserPasswordHelp.className = 'text-xs mt-1 text-emerald-400';
                    newUserPassword.classList.add('border-emerald-500');
                }
            }
            
            // Validar confirmación si hay texto en ambos campos
            if (confirmPassword && password !== confirmPassword) {
                newUserConfirmPassword?.classList.remove('border-emerald-500', 'border-slate-600');
                newUserConfirmPassword?.classList.add('border-rose-500');
                if (newUserConfirmPasswordHelp) {
                    newUserConfirmPasswordHelp.textContent = 'Las contraseñas no coinciden';
                    newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-rose-400';
                }
            } else if (confirmPassword && password === confirmPassword && password.length >= 3) {
                newUserConfirmPassword?.classList.remove('border-rose-500', 'border-slate-600');
                newUserConfirmPassword?.classList.add('border-emerald-500');
                if (newUserConfirmPasswordHelp) {
                    newUserConfirmPasswordHelp.textContent = '¡Contraseñas coinciden!';
                    newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-emerald-400';
                }
            } else if (confirmPassword) {
                newUserConfirmPassword?.classList.remove('border-emerald-500', 'border-rose-500');
                newUserConfirmPassword?.classList.add('border-slate-600');
                if (newUserConfirmPasswordHelp) {
                    newUserConfirmPasswordHelp.textContent = 'Las contraseñas deben coincidir';
                    newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-slate-400';
                }
            }
            
            // Controlar el estado del botón
            updateNewUserButtonState(username, password, confirmPassword);
        });
    }
    
    if (newUserConfirmPassword) {
        newUserConfirmPassword.addEventListener('input', () => {
            const username = newUserUsername?.value?.trim();
            const password = newUserPassword?.value?.trim();
            const confirmPassword = newUserConfirmPassword.value.trim();
            
            // Limpiar clases de validación anteriores
            newUserConfirmPassword.classList.remove('border-rose-500', 'border-emerald-500', 'border-slate-600');
            
            if (confirmPassword.length === 0) {
                newUserConfirmPassword.classList.add('border-slate-600');
                if (newUserConfirmPasswordHelp) {
                    newUserConfirmPasswordHelp.textContent = 'Las contraseñas deben coincidir';
                    newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-slate-400';
                }
            } else if (password === confirmPassword && password && password.length >= 3) {
                newUserConfirmPassword.classList.add('border-emerald-500');
                if (newUserConfirmPasswordHelp) {
                    newUserConfirmPasswordHelp.textContent = '¡Contraseñas coinciden!';
                    newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-emerald-400';
                }
            } else if (confirmPassword) {
                newUserConfirmPassword.classList.add('border-rose-500');
                if (newUserConfirmPasswordHelp) {
                    newUserConfirmPasswordHelp.textContent = 'Las contraseñas no coinciden';
                    newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-rose-400';
                }
            }
            
            // Controlar el estado del botón
            updateNewUserButtonState(username, password, confirmPassword);
        });
    }
    
    // Permitir crear usuario con Enter en los campos del modal
    if (newUserUsername) {
        newUserUsername.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!btnSaveNewUser.disabled) {
                    btnSaveNewUser.click();
                }
            }
        });
    }
    
    if (newUserPassword) {
        newUserPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!btnSaveNewUser.disabled) {
                    btnSaveNewUser.click();
                }
            }
        });
    }
    
    if (newUserConfirmPassword) {
        newUserConfirmPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!btnSaveNewUser.disabled) {
                    btnSaveNewUser.click();
                }
            }
        });
    }
    
    // Validación en tiempo real para los campos de contraseña
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput.value.trim();
            const confirmPassword = confirmNewPasswordInput?.value?.trim();
            
            // Limpiar clases de validación anteriores
            newPasswordInput.classList.remove('border-rose-500', 'border-emerald-500', 'border-slate-600');
            
            // Actualizar mensaje de ayuda
            if (newPasswordHelp) {
                if (password.length === 0) {
                    newPasswordHelp.textContent = 'La contraseña debe tener al menos 3 caracteres';
                    newPasswordHelp.className = 'text-xs mt-1 text-slate-400';
                    newPasswordInput.classList.add('border-slate-600');
                } else if (password.length < 3) {
                    newPasswordHelp.textContent = `Muy corta (${password.length}/3 caracteres)`;
                    newPasswordHelp.className = 'text-xs mt-1 text-rose-400';
                    newPasswordInput.classList.add('border-rose-500');
                } else {
                    newPasswordHelp.textContent = `Perfecta (${password.length} caracteres)`;
                    newPasswordHelp.className = 'text-xs mt-1 text-emerald-400';
                    newPasswordInput.classList.add('border-emerald-500');
                }
            }
            
            // Validar confirmación si hay texto en ambos campos
            if (confirmPassword && password !== confirmPassword) {
                confirmNewPasswordInput?.classList.remove('border-emerald-500', 'border-slate-600');
                confirmNewPasswordInput?.classList.add('border-rose-500');
                if (confirmPasswordHelp) {
                    confirmPasswordHelp.textContent = 'Las contraseñas no coinciden';
                    confirmPasswordHelp.className = 'text-xs mt-1 text-rose-400';
                }
            } else if (confirmPassword && password === confirmPassword && password.length >= 3) {
                confirmNewPasswordInput?.classList.remove('border-rose-500', 'border-slate-600');
                confirmNewPasswordInput?.classList.add('border-emerald-500');
                if (confirmPasswordHelp) {
                    confirmPasswordHelp.textContent = '¡Contraseñas coinciden!';
                    confirmPasswordHelp.className = 'text-xs mt-1 text-emerald-400';
                }
            } else if (confirmPassword) {
                confirmNewPasswordInput?.classList.remove('border-emerald-500', 'border-rose-500');
                confirmNewPasswordInput?.classList.add('border-slate-600');
                if (confirmPasswordHelp) {
                    confirmPasswordHelp.textContent = 'Las contraseñas deben coincidir';
                    confirmPasswordHelp.className = 'text-xs mt-1 text-slate-400';
                }
            }
            
            // Controlar el estado del botón
            updateChangePasswordButtonState(password, confirmPassword);
        });
    }
    
    if (confirmNewPasswordInput) {
        confirmNewPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput?.value?.trim();
            const confirmPassword = confirmNewPasswordInput.value.trim();
            
            // Limpiar clases de validación anteriores
            confirmNewPasswordInput.classList.remove('border-rose-500', 'border-emerald-500', 'border-slate-600');
            
            if (confirmPassword.length === 0) {
                confirmNewPasswordInput.classList.add('border-slate-600');
                if (confirmPasswordHelp) {
                    confirmPasswordHelp.textContent = 'Las contraseñas deben coincidir';
                    confirmPasswordHelp.className = 'text-xs mt-1 text-slate-400';
                }
            } else if (password === confirmPassword && password && password.length >= 3) {
                confirmNewPasswordInput.classList.add('border-emerald-500');
                if (confirmPasswordHelp) {
                    confirmPasswordHelp.textContent = '¡Contraseñas coinciden!';
                    confirmPasswordHelp.className = 'text-xs mt-1 text-emerald-400';
                }
            } else if (confirmPassword) {
                confirmNewPasswordInput.classList.add('border-rose-500');
                if (confirmPasswordHelp) {
                    confirmPasswordHelp.textContent = 'Las contraseñas no coinciden';
                    confirmPasswordHelp.className = 'text-xs mt-1 text-rose-400';
                }
            }
            
            // Controlar el estado del botón
            updateChangePasswordButtonState(password, confirmPassword);
        });
    }
    
    // Función para controlar el estado del botón de cambiar contraseña
    function updateChangePasswordButtonState(password, confirmPassword) {
        if (btnSaveNewPassword) {
            const passwordsMatch = password === confirmPassword;
            const passwordValid = password && password.length >= 3;
            const confirmPasswordValid = confirmPassword && confirmPassword.length > 0;
            
            if (passwordsMatch && passwordValid && confirmPasswordValid) {
                // Habilitar botón
                btnSaveNewPassword.disabled = false;
                btnSaveNewPassword.classList.remove('btn-disabled');
                btnSaveNewPassword.classList.add('hover:bg-amber-700');
            } else {
                // Deshabilitar botón
                btnSaveNewPassword.disabled = true;
                btnSaveNewPassword.classList.add('btn-disabled');
                btnSaveNewPassword.classList.remove('hover:bg-amber-700');
            }
        }
    }

    // Función para cerrar el modal de cambiar contraseña
    function closeChangePasswordModal() {
        if (changePasswordModal) {
            changePasswordModal.classList.add('hidden');
            changePasswordModal.classList.remove('flex');
            // Limpiar campos
            if (newPasswordInput) {
                newPasswordInput.value = '';
                newPasswordInput.classList.remove('border-rose-500', 'border-emerald-500');
                newPasswordInput.classList.add('border-slate-600');
            }
            if (confirmNewPasswordInput) {
                confirmNewPasswordInput.value = '';
                confirmNewPasswordInput.classList.remove('border-rose-500', 'border-emerald-500');
                confirmNewPasswordInput.classList.add('border-slate-600');
            }
            // Resetear mensajes de ayuda
            if (newPasswordHelp) {
                newPasswordHelp.textContent = 'La contraseña debe tener al menos 3 caracteres';
                newPasswordHelp.className = 'text-xs mt-1 text-slate-400';
            }
            if (confirmPasswordHelp) {
                confirmPasswordHelp.textContent = 'Las contraseñas deben coincidir';
                confirmPasswordHelp.className = 'text-xs mt-1 text-slate-400';
            }
            // Resetear estado del botón
            if (btnSaveNewPassword) {
                btnSaveNewPassword.disabled = true;
                btnSaveNewPassword.classList.add('btn-disabled');
                btnSaveNewPassword.classList.remove('hover:bg-amber-700');
            }
        }
    }

    // 🔄 NUEVO: Cerrar modal de cambiar contraseña al hacer clic fuera
    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', (e) => {
            // Si se hace clic en el fondo del modal (no en el contenido)
            if (e.target === changePasswordModal) {
                closeChangePasswordModal();
            }
        });
    }

    // Funciones para el modal de crear nuevo usuario
    function showNewUserModal() {
        if (newUserModal) {
            newUserModal.classList.remove('hidden');
            newUserModal.classList.add('flex');
            // Limpiar campos
            if (newUserUsername) newUserUsername.value = '';
            if (newUserPassword) newUserPassword.value = '';
            if (newUserConfirmPassword) newUserConfirmPassword.value = '';
            // Resetear validaciones
            resetNewUserValidation();
        }
    }

    function closeNewUserModal() {
        if (newUserModal) {
            newUserModal.classList.add('hidden');
            newUserModal.classList.remove('flex');
            resetNewUserValidation();
        }
    }

    // 🔄 NUEVO: Cerrar modal de crear nuevo usuario al hacer clic fuera
    if (newUserModal) {
        newUserModal.addEventListener('click', (e) => {
            // Si se hace clic en el fondo del modal (no en el contenido)
            if (e.target === newUserModal) {
                closeNewUserModal();
            }
        });
    }

    function resetNewUserValidation() {
        // Resetear clases de validación
        if (newUserUsername) {
            newUserUsername.classList.remove('border-rose-500', 'border-emerald-500');
            newUserUsername.classList.add('border-slate-600');
        }
        if (newUserPassword) {
            newUserPassword.classList.remove('border-rose-500', 'border-emerald-500');
            newUserPassword.classList.add('border-slate-600');
        }
        if (newUserConfirmPassword) {
            newUserConfirmPassword.classList.remove('border-rose-500', 'border-emerald-500');
            newUserConfirmPassword.classList.add('border-slate-600');
        }
        // Resetear mensajes de ayuda
        if (newUserPasswordHelp) {
            newUserPasswordHelp.textContent = 'La contraseña debe tener al menos 3 caracteres';
            newUserPasswordHelp.className = 'text-xs mt-1 text-slate-400';
        }
        if (newUserConfirmPasswordHelp) {
            newUserConfirmPasswordHelp.textContent = 'Las contraseñas deben coincidir';
            newUserConfirmPasswordHelp.className = 'text-xs mt-1 text-slate-400';
        }
        // Resetear estado del botón
        if (btnSaveNewUser) {
            btnSaveNewUser.disabled = true;
            btnSaveNewUser.classList.add('btn-disabled');
            btnSaveNewUser.classList.remove('hover:bg-indigo-700');
        }
    }

    function updateNewUserButtonState(username, password, confirmPassword) {
        if (btnSaveNewUser) {
            const usernameValid = username && username.trim().length > 0;
            const passwordsMatch = password === confirmPassword;
            const passwordValid = password && password.length >= 3;
            const confirmPasswordValid = confirmPassword && confirmPassword.length > 0;
            
            if (usernameValid && passwordsMatch && passwordValid && confirmPasswordValid) {
                // Habilitar botón
                btnSaveNewUser.disabled = false;
                btnSaveNewUser.classList.remove('btn-disabled');
                btnSaveNewUser.classList.add('hover:bg-indigo-700');
            } else {
                // Deshabilitar botón
                btnSaveNewUser.disabled = true;
                btnSaveNewUser.classList.add('btn-disabled');
                btnSaveNewUser.classList.remove('hover:bg-indigo-700');
            }
        }
    }

    // Initial setup: Muestra la pantalla de login al inicio
    showLoginScreen();
    await populateAssignedUsers(); // Carga los usuarios en los selects (para que "Agustín" y "Héctor" no queden fijos, y aparezca "Admin")


    // periodic refresh
    setInterval(() => { if (CURRENT_USER) renderTasks(); }, 5000); // Solo renderizar si hay un usuario logueado

    // Función para mostrar el modal de éxito de usuario creado
    function showUserCreatedSuccessModal() {
        if (userCreatedSuccessModal) {
            userCreatedSuccessModal.classList.remove('hidden');
            userCreatedSuccessModal.classList.add('flex');
        }
    }

    // Función para cerrar el modal de éxito
    function closeUserCreatedSuccessModal() {
        if (userCreatedSuccessModal) {
            userCreatedSuccessModal.classList.add('hidden');
            userCreatedSuccessModal.classList.remove('flex');
        }
    }

    // Event listener para cerrar el modal de éxito
    if (btnCloseSuccessModal) {
        btnCloseSuccessModal.addEventListener('click', closeUserCreatedSuccessModal);
    }

    // Event listeners para los botones de transferencia
    // Los botones de transferencia han sido eliminados, ahora solo se usa doble clic

    // Función para mover usuario de disponible a usuarios con visibilidad
    function moveUserToSupervised(username) {
        const userDiv = availableUsersList.querySelector(`[data-username="${username}"]`);
        if (userDiv) {
            userDiv.remove();
            // Crear nuevo div en la lista de usuarios con visibilidad
            const newUserDiv = document.createElement('div');
            newUserDiv.className = 'flex items-center p-2 bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors cursor-pointer';
            newUserDiv.dataset.username = username;
            newUserDiv.innerHTML = userDiv.innerHTML;
            supervisedUsersList.appendChild(newUserDiv);
            
            // Limpiar el mensaje "No hay usuarios con visibilidad" si existe
            const noUsersMessage = supervisedUsersList.querySelector('p.text-slate-400');
            if (noUsersMessage) {
                noUsersMessage.remove();
            }
        }
    }

    // Función para mover usuario de usuarios con visibilidad a disponible
    function moveUserToAvailable(username) {
        const userDiv = supervisedUsersList.querySelector(`[data-username="${username}"]`);
        if (userDiv) {
            userDiv.remove();
            // Crear nuevo div en la lista de disponibles
            const newUserDiv = document.createElement('div');
            newUserDiv.className = 'flex items-center p-2 bg-slate-600 rounded-md hover:bg-slate-500 transition-colors cursor-pointer';
            newUserDiv.dataset.username = username;
            newUserDiv.innerHTML = userDiv.innerHTML;
            availableUsersList.appendChild(newUserDiv);
            
            // Si no quedan usuarios con visibilidad, mostrar el mensaje
            if (supervisedUsersList.children.length === 0) {
                supervisedUsersList.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">No hay usuarios con visibilidad</p>';
            }
        }
    }

    // Event listeners para selección de usuarios en las listas
    if (availableUsersList) {
        availableUsersList.addEventListener('click', (e) => {
            const userDiv = e.target.closest('[data-username]');
            if (userDiv) {
                // Remover selección previa
                availableUsersList.querySelectorAll('[data-username]').forEach(div => {
                    div.classList.remove('bg-slate-500');
                    div.classList.add('bg-slate-600');
                });
                // Seleccionar usuario actual
                userDiv.classList.remove('bg-slate-600');
                userDiv.classList.add('bg-slate-500');
            }
        });
    }

    if (supervisedUsersList) {
        supervisedUsersList.addEventListener('click', (e) => {
            const userDiv = e.target.closest('[data-username]');
            if (userDiv) {
                // Remover selección previa
                supervisedUsersList.querySelectorAll('[data-username]').forEach(div => {
                    div.classList.remove('bg-emerald-500');
                    div.classList.add('bg-emerald-600');
                });
                // Seleccionar usuario actual
                userDiv.classList.remove('bg-emerald-600');
                userDiv.classList.add('bg-emerald-500');
            }
        });
    }

    // Event listeners para los filtros de búsqueda en las listas
    if (filterAvailableUsers) {
        filterAvailableUsers.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterUsersInList(availableUsersList, searchTerm);
        });
        
        // Permitir usar Enter para transferir el primer usuario visible
        filterAvailableUsers.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstVisibleUser = availableUsersList.querySelector('[data-username]');
                if (firstVisibleUser && firstVisibleUser.style.display !== 'none') {
                    const username = firstVisibleUser.dataset.username;
                    moveUserToSupervised(username);
                    filterAvailableUsers.value = '';
                    filterUsersInList(availableUsersList, '');
                }
            }
        });
    }

    if (filterSupervisedUsers) {
        filterSupervisedUsers.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterUsersInList(supervisedUsersList, searchTerm);
        });
        
        // Permitir usar Enter para quitar el primer usuario visible
        filterSupervisedUsers.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstVisibleUser = supervisedUsersList.querySelector('[data-username]');
                if (firstVisibleUser && firstVisibleUser.style.display !== 'none') {
                    const username = firstVisibleUser.dataset.username;
                    moveUserToAvailable(username);
                    filterSupervisedUsers.value = '';
                    filterUsersInList(supervisedUsersList, '');
                }
            }
        });
    }

    // Función para filtrar usuarios en una lista
    function filterUsersInList(listElement, searchTerm) {
        if (!listElement) return;
        
        listElement.querySelectorAll('[data-username]').forEach(userDiv => {
            const username = userDiv.dataset.username.toLowerCase();
            if (username.includes(searchTerm)) {
                userDiv.style.display = 'flex';
            } else {
                userDiv.style.display = 'none';
            }
        });
    }

    // Event listeners para filtros en tiempo real
    if (filterUserName) {
        filterUserName.addEventListener('input', applyUserFilters);
    }

    if (filterUserRole) {
        filterUserRole.addEventListener('change', applyUserFilters);
    }

    if (filterVisibleBy) {
        filterVisibleBy.addEventListener('change', applyUserFilters);
    }

    if (btnClearUserFilters) {
        btnClearUserFilters.addEventListener('click', () => {
            filterUserName.value = '';
            filterUserRole.value = '';
            if (filterVisibleBy) filterVisibleBy.value = '';
            loadUsers(); // Cargar todos los usuarios sin filtros
        });
    }

    // Event listener para el cambio de rol en el modal de edición
    if (editUserRole) {
        editUserRole.addEventListener('change', async () => {
            const isAdmin = editUserRole.value === 'Administrador';
            const visibilitySection = editUserModal.querySelector('.grid.grid-cols-3');
            
            if (visibilitySection) {
                if (isAdmin) {
                    visibilitySection.style.display = 'none';
                } else {
                    visibilitySection.style.display = 'grid';
                }
            }
            
            // 🔒 NUEVA FUNCIONALIDAD: Verificar si se puede cambiar de administrador a estándar
            if (editingUsername && !isAdmin) {
                const canChangeToStandard = await checkIfCanChangeToStandard(editingUsername);
                if (!canChangeToStandard) {
                    // No se puede cambiar, revertir el cambio
                    editUserRole.value = 'Administrador';
                    showToast('No se puede cambiar a usuario estándar: es el último administrador del sistema', 'error');
                    
                    // Ocultar la sección de visibilidad ya que sigue siendo admin
                    if (visibilitySection) {
                        visibilitySection.style.display = 'none';
                    }
                }
                
                // Mostrar/ocultar mensaje de ayuda
                const editUserRoleHelp = document.getElementById('edit-user-role-help');
                if (editUserRoleHelp) {
                    if (canChangeToStandard) {
                        editUserRoleHelp.classList.add('hidden');
                    } else {
                        editUserRoleHelp.classList.remove('hidden');
                    }
                }
            } else {
                // Ocultar mensaje de ayuda si no es necesario
                const editUserRoleHelp = document.getElementById('edit-user-role-help');
                if (editUserRoleHelp) editUserRoleHelp.classList.add('hidden');
            }
        });
    }

    // Event listeners para doble clic en las listas (transferencia entre listas)
    if (availableUsersList) {
        availableUsersList.addEventListener('dblclick', (e) => {
            const userDiv = e.target.closest('[data-username]');
            if (userDiv) {
                const username = userDiv.dataset.username;
                moveUserToSupervised(username);
            }
        });
    }

    if (supervisedUsersList) {
        supervisedUsersList.addEventListener('dblclick', (e) => {
            const userDiv = e.target.closest('[data-username]');
            if (userDiv) {
                const username = userDiv.dataset.username;
                moveUserToAvailable(username);
            }
        });
    }

    // Funciones para el modal de información del usuario
    async function showUserInfoModal() {
        if (!CURRENT_USER) return;
        
        const users = await loadAllUsers();
        const currentUserData = users.find(u => u.username === CURRENT_USER);
        
        if (!currentUserData) return;
        
        // Usuarios que tengo visibilidad (mis supervisedUsers)
        const usersIHaveVisibilityList = currentUserData.supervisedUsers || [];
        
        // Usuarios que tienen visibilidad sobre mí
        const usersWhoHaveVisibilityOverMeList = users.filter(user => 
            user.username !== CURRENT_USER && 
            (user.supervisedUsers || []).includes(CURRENT_USER)
        ).map(user => user.username);
        
        // Renderizar lista de usuarios que tengo visibilidad
        if (usersIHaveVisibility) {
            if (usersIHaveVisibilityList.length === 0) {
                usersIHaveVisibility.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">No tienes visibilidad sobre ningún usuario</p>';
            } else {
                usersIHaveVisibility.innerHTML = usersIHaveVisibilityList.map(username => `
                    <div class="bg-slate-600 p-3 rounded-lg">
                        <span class="font-medium text-emerald-300">${escapeHtml(username)}</span>
                    </div>
                `).join('');
            }
        }
        
        // Renderizar lista de usuarios que tienen visibilidad sobre mí
        if (usersWhoHaveVisibilityOverMe) {
            if (usersWhoHaveVisibilityOverMeList.length === 0) {
                usersWhoHaveVisibilityOverMe.innerHTML = '<p class="text-sm text-slate-400 text-center p-4">Ningún usuario tiene visibilidad sobre ti</p>';
            } else {
                usersWhoHaveVisibilityOverMe.innerHTML = usersWhoHaveVisibilityOverMeList.map(username => `
                    <div class="bg-slate-600 p-3 rounded-lg">
                        <span class="font-medium text-blue-300">${escapeHtml(username)}</span>
                    </div>
                `).join('');
            }
        }
        
        // Mostrar el modal
        if (userInfoModal) {
            userInfoModal.classList.remove('hidden');
            userInfoModal.classList.add('flex');
        }
    }
    
    function closeUserInfoModal() {
        if (userInfoModal) {
            userInfoModal.classList.add('hidden');
            userInfoModal.classList.remove('flex');
        }
    }

    // 🔄 NUEVO: Cerrar modal de información del usuario al hacer clic fuera
    if (userInfoModal) {
        userInfoModal.addEventListener('click', (e) => {
            // Si se hace clic en el fondo del modal (no en el contenido)
            if (e.target === userInfoModal) {
                closeUserInfoModal();
            }
        });
    }

    // Función de prueba para verificar el menú hamburguesa
    function testUserManagementHamburgerMenu() {
        console.log('=== PRUEBA DEL MENÚ HAMBURGUESA DE GESTIÓN DE USUARIOS ===');
        
        const button = document.getElementById('hamburger-button-user-management');
        const dropdown = document.getElementById('hamburger-dropdown-user-management');
        
        console.log('Elementos encontrados:', { button, dropdown });
        
        if (button) {
            console.log('Simulando clic en el botón hamburguesa...');
            button.click();
            
            setTimeout(() => {
                console.log('Estado del dropdown después del clic:', dropdown ? dropdown.classList.contains('show') : 'N/A');
                
                if (dropdown && dropdown.classList.contains('show')) {
                    console.log('✅ Menú hamburguesa funcionando correctamente');
                } else {
                    console.log('❌ Menú hamburguesa no está funcionando');
                }
            }, 100);
        } else {
            console.log('❌ Botón hamburguesa no encontrado');
        }
    }
    
    // Exponer la función de prueba en el objeto window para debugging
    window.testUserManagementHamburgerMenu = testUserManagementHamburgerMenu;
    
    // Configura el menú hamburguesa para la pantalla de gestión de usuarios

    // 🔄 NUEVO: Sistema de estado online/offline en tiempo real
    let onlineStatusInterval = null;
    let lastOnlineStatusHash = null;
    let lastUserReloadTime = null;
    
    // 🔄 NUEVO: Sistema de verificación activa de usuarios online
    let activeUserVerificationInterval = null;
    let lastUserActivityCheck = {};
    
    // Función para generar un hash del estado online de los usuarios
    function generateOnlineStatusHash() {
        const onlineUsers = ALL_USERS_CACHE.map(user => {
            // Un usuario está online si:
            // 1. Es el usuario actual (siempre online)
            // 2. Ha tenido actividad reciente (últimos 5 minutos)
            const now = new Date();
            const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
            const isRecentlyActive = lastActivity && (now - lastActivity) < 5 * 60 * 1000; // 5 minutos
            
            const isOnline = user.username === CURRENT_USER || isRecentlyActive;
            return `${user.username}:${isOnline ? 'online' : 'offline'}`;
        }).sort().join('|');
        
        let hash = 0;
        for (let i = 0; i < onlineUsers.length; i++) {
            const char = onlineUsers.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    // Función para verificar cambios en el estado online de los usuarios
    async function checkOnlineStatusChanges() {
        try {
            // 🔄 NUEVO: Recargar usuarios desde el archivo para obtener estados actualizados
            // Recargar cada 2 segundos para máxima precisión
            const now = Date.now();
            if (!lastUserReloadTime || (now - lastUserReloadTime) > 2000) {
                const freshUsers = await window.api.getUsers();
                const hasUserChanges = JSON.stringify(freshUsers) !== JSON.stringify(ALL_USERS_CACHE);
                
                if (hasUserChanges) {
                    ALL_USERS_CACHE = freshUsers;
                    console.log('🔄 Usuarios actualizados desde archivo (cada 2s)');
                }
                lastUserReloadTime = now;
            }
            
            const currentHash = generateOnlineStatusHash();
            
            // Si es la primera vez, solo guardar el hash
            if (lastOnlineStatusHash === null) {
                lastOnlineStatusHash = currentHash;
                return;
            }
            
            // Si hay cambios en el estado online
            if (currentHash !== lastOnlineStatusHash) {
                console.log('🔄 Cambios detectados en el estado online de los usuarios');
                
                // 🔄 NUEVO: Detectar qué usuarios cambiaron de estado para mostrar notificaciones específicas
                const previousUsers = ALL_USERS_CACHE.map(user => ({
                    username: user.username,
                    wasOnline: user.username === CURRENT_USER || 
                               (user.lastActivity && (new Date() - new Date(user.lastActivity)) < 5 * 60 * 1000)
                }));
                
                lastOnlineStatusHash = currentHash;
                
                // Actualizar la interfaz según la pantalla actual
                const currentScreen = getCurrentScreen();
                
                if (currentScreen === 'user-management') {
                    // Actualizar la tabla de usuarios para mostrar el nuevo estado online
                    await loadUsers();
                    console.log('🔄 Tabla de usuarios actualizada automáticamente');
                }
                
                // También actualizar los filtros si estamos en la pantalla principal
                if (currentScreen === 'main') {
                    await populateAssignedUsers();
                }
                
                // 🔄 NUEVO: Mostrar notificaciones específicas sobre cambios de estado
                const currentUsers = ALL_USERS_CACHE.map(user => ({
                    username: user.username,
                    isOnline: user.username === CURRENT_USER || 
                              (user.lastActivity && (new Date() - new Date(user.lastActivity)) < 5 * 60 * 1000)
                }));
                
                // Detectar usuarios que se conectaron
                const usersWhoCameOnline = currentUsers.filter(current => {
                    const previous = previousUsers.find(p => p.username === current.username);
                    return previous && !previous.wasOnline && current.isOnline;
                });
                
                // Detectar usuarios que se desconectaron
                const usersWhoWentOffline = currentUsers.filter(current => {
                    const previous = previousUsers.find(p => p.username === current.username);
                    return previous && previous.wasOnline && !current.isOnline;
                });
                
                // Mostrar notificaciones específicas solo si hay cambios reales
                if (usersWhoCameOnline.length > 0) {
                    const usernames = usersWhoCameOnline.map(u => u.username).join(', ');
                    showToast(`${usernames} se ha(n) conectado`, 'success');
                    console.log(`🟢 Usuarios conectados: ${usernames}`);
                }
                
                if (usersWhoWentOffline.length > 0) {
                    const usernames = usersWhoWentOffline.map(u => u.username).join(', ');
                    showToast(`${usernames} se ha(n) desconectado`, 'info');
                    console.log(`🔴 Usuarios desconectados: ${usernames}`);
                }
            }
        } catch (error) {
            console.error('Error al verificar cambios de estado online:', error);
        }
    }
    
    // Función para iniciar el monitoreo del estado online
    function startOnlineStatusMonitoring() {
        if (onlineStatusInterval) {
            clearInterval(onlineStatusInterval);
        }
        
        // Verificar cambios cada 2 segundos para mayor precisión y confiabilidad
        onlineStatusInterval = setInterval(checkOnlineStatusChanges, 2000);
        
        // 🔄 NUEVO: Sistema de sincronización ULTRA RÁPIDA de tareas
        // Sincronizar cambios cada 500ms para máxima responsividad
        const taskSyncInterval = setInterval(async () => {
            if (CURRENT_USER) {
                await syncTasksInRealTime();
            }
        }, 500); // 500ms = medio segundo
        
        // 🔄 NUEVO: Sistema de heartbeat automático para mantener el usuario online
        // Registrar actividad cada 30 segundos para mantener el estado online (más frecuente)
        const heartbeatInterval = setInterval(async () => {
            if (CURRENT_USER) {
                await recordUserActivity();
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30 * 1000); // 30 segundos
        
        // 🔄 NUEVO: Sistema de verificación activa de usuarios online
        // Verificar cada 3 segundos si los usuarios están realmente online
        activeUserVerificationInterval = setInterval(async () => {
            if (CURRENT_USER && CURRENT_USER_ROLE === 'Administrador') {
                await verifyAllUsersOnlineStatus();
            }
        }, 3 * 1000); // 3 segundos
        

        
        // 🔄 NUEVO: Sistema de detección de actividad del usuario
        // Registrar actividad cuando el usuario interactúa con la aplicación
        const userActivityEvents = ['mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        let activityTimeout;
        
        // Función para manejar la actividad del usuario (definida fuera para poder limpiarla)
        window.handleUserActivity = () => {
            // Debounce: solo registrar actividad después de 30 segundos de inactividad
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(async () => {
                if (CURRENT_USER) {
                    await recordUserActivity();
                }
            }, 30000); // 30 segundos
        };
        
        // Agregar event listeners para detectar actividad del usuario
        userActivityEvents.forEach(eventType => {
            document.addEventListener(eventType, window.handleUserActivity, { passive: true });
        });
        
        // 🔄 NUEVO: Detectar cuando la ventana pierde el foco o se cierra
        // para marcar al usuario como offline
        window.handleBeforeUnload = async () => {
            if (CURRENT_USER) {
                // Marcar al usuario como offline inmediatamente al cerrar
                try {
                    const allUsers = await window.api.getUsers();
                    const currentUserIndex = allUsers.findIndex(u => u.username === CURRENT_USER);
                    if (currentUserIndex !== -1) {
                        // Marcar como offline (última actividad hace más de 5 minutos)
                        const offlineTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutos atrás
                        allUsers[currentUserIndex].lastActivity = offlineTime.toISOString();
                        await window.api.writeUsers(allUsers);
                        console.log(`🔴 Usuario ${CURRENT_USER} marcado como offline al cerrar`);
                    }
                } catch (error) {
                    console.error('Error al marcar usuario como offline:', error);
                }
            }
        };
        
        // Detectar cuando la ventana pierde el foco (usuario cambia a otra aplicación)
        window.handleBlur = async () => {
            if (CURRENT_USER) {
                // Marcar como inactivo temporalmente
                setTimeout(async () => {
                    if (document.hasFocus()) return; // Si ya recuperó el foco, no hacer nada
                    
                    try {
                        const allUsers = await window.api.getUsers();
                        const currentUserIndex = allUsers.findIndex(u => u.username === CURRENT_USER);
                        if (currentUserIndex !== -1) {
                            // Marcar como inactivo (última actividad hace más de 5 minutos)
                            const inactiveTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutos atrás
                            allUsers[currentUserIndex].lastActivity = inactiveTime.toISOString();
                            await window.api.writeUsers(allUsers);
                            console.log(`🟡 Usuario ${CURRENT_USER} marcado como inactivo por pérdida de foco`);
                        }
                    } catch (error) {
                        console.error('Error al marcar usuario como inactivo:', error);
                    }
                }, 5 * 60 * 1000); // Esperar 5 minutos antes de marcar como inactivo
            }
        };
        
        // Agregar event listeners
        window.addEventListener('beforeunload', window.handleBeforeUnload);
        window.addEventListener('blur', window.handleBlur);
        
        // 🔄 NUEVO: Detectar cuando la ventana recupera el foco para restaurar estado online
        window.handleFocus = async () => {
            if (CURRENT_USER) {
                // Restaurar estado online inmediatamente
                await recordUserActivity();
                console.log(`🟢 Usuario ${CURRENT_USER} restaurado como online al recuperar foco`);
            }
        };
        
        window.addEventListener('focus', window.handleFocus);
        
        console.log('🟢 Monitoreo de estado online iniciado');
    }
    
    // Función para detener el monitoreo del estado online
    function stopOnlineStatusMonitoring() {
        if (onlineStatusInterval) {
            clearInterval(onlineStatusInterval);
            onlineStatusInterval = null;
        }
        
        // 🔄 NUEVO: Limpiar event listeners de actividad del usuario
        const userActivityEvents = ['mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        userActivityEvents.forEach(eventType => {
            if (window.handleUserActivity) {
                document.removeEventListener(eventType, window.handleUserActivity);
            }
        });
        
        // 🔄 NUEVO: Limpiar event listeners de foco y cierre de ventana
        window.removeEventListener('beforeunload', window.handleBeforeUnload);
        window.removeEventListener('blur', window.handleBlur);
        window.removeEventListener('focus', window.handleFocus);
        
        // 🔄 NUEVO: Limpiar intervalo de verificación activa
        if (activeUserVerificationInterval) {
            clearInterval(activeUserVerificationInterval);
            activeUserVerificationInterval = null;
        }
        
        // 🔄 NUEVO: Limpiar intervalo de sincronización de tareas
        if (taskSyncInterval) {
            clearInterval(taskSyncInterval);
            taskSyncInterval = null;
        }
        
        console.log('🟢 Monitoreo de estado online detenido');
    }
    
    // Función para actualizar el estado online del usuario actual
    function updateCurrentUserOnlineStatus() {
        // Esta función se puede llamar cuando el usuario hace alguna acción
        // para indicar que está activo
        if (lastOnlineStatusHash !== null) {
            // Forzar una verificación inmediata
            checkOnlineStatusChanges();
        }
    }
    

    
    // 🔄 NUEVA FUNCIÓN: Sincronización ULTRA RÁPIDA de tareas en tiempo real
    async function syncTasksInRealTime() {
        try {
            // Solo sincronizar si estamos en una pantalla relevante
            const currentScreen = getCurrentScreen();
            if (currentScreen !== 'main' && currentScreen !== 'task-edit') {
                return;
            }
            
            // Obtener tareas actualizadas desde el archivo
            const freshTasks = await window.api.readTasks();
            const currentTasks = TASKS_CACHE || [];
            
            // Verificar si hay cambios en las tareas
            const hasTaskChanges = JSON.stringify(freshTasks) !== JSON.stringify(currentTasks);
            
            if (hasTaskChanges) {
                console.log('🔄 Sincronización ULTRA RÁPIDA: Cambios detectados en tareas');
                
                // Actualizar caché local
                TASKS_CACHE = freshTasks;
                
                // Actualizar interfaz según la pantalla
                if (currentScreen === 'main') {
                    renderTasks();
                } else if (currentScreen === 'task-edit' && OPEN_TASK_ID) {
                    // Si estamos editando una tarea, actualizar solo esa tarea
                    const updatedTask = freshTasks.find(t => t.id === OPEN_TASK_ID);
                    if (updatedTask) {
                        updateTaskFormInRealTime(updatedTask);
                    }
                }
                
                console.log('✅ Sincronización ULTRA RÁPIDA completada');
            }
        } catch (error) {
            console.error('Error en sincronización ultra rápida:', error);
        }
    }
    
    // 🔄 NUEVA FUNCIÓN: Actualizar formulario de tarea en tiempo real sin perder foco
    function updateTaskFormInRealTime(updatedTask) {
        try {
            // Solo actualizar campos que NO estén siendo editados actualmente
            const activeElement = document.activeElement;
            
            // Actualizar título si no está siendo editado
            const titleInput = document.getElementById('task-title');
            if (titleInput && titleInput !== activeElement && titleInput.value !== updatedTask.title) {
                titleInput.value = updatedTask.title;
                showToast(`Título actualizado por otro usuario: "${updatedTask.title}"`, 'info');
            }
            
            // Actualizar descripción si no está siendo editada
            const descriptionTextarea = document.getElementById('task-description');
            if (descriptionTextarea && descriptionTextarea !== activeElement && descriptionTextarea.value !== updatedTask.description) {
                descriptionTextarea.value = updatedTask.description;
                showToast(`Descripción actualizada por otro usuario`, 'info');
            }
            
            // Actualizar estado si no está siendo editado
            const statusSelect = document.getElementById('task-status');
            if (statusSelect && statusSelect !== activeElement && statusSelect.value !== updatedTask.status) {
                statusSelect.value = updatedTask.status;
                showToast(`Estado actualizado por otro usuario: ${updatedTask.status}`, 'info');
            }
            
            // Actualizar prioridad si no está siendo editada
            const prioritySelect = document.getElementById('task-priority');
            if (prioritySelect && prioritySelect !== activeElement && prioritySelect.value !== updatedTask.priority) {
                prioritySelect.value = updatedTask.priority;
                showToast(`Prioridad actualizada por otro usuario: ${updatedTask.priority}`, 'info');
            }
            
            // Actualizar fecha límite si no está siendo editada
            const dueDateInput = document.getElementById('task-due-date');
            if (dueDateInput && dueDateInput !== activeElement && dueDateInput.value !== updatedTask.dueDate) {
                dueDateInput.value = updatedTask.dueDate || '';
                showToast(`Fecha límite actualizada por otro usuario`, 'info');
            }
            
            // Actualizar usuario asignado si no está siendo editado
            const assignedToSelect = document.getElementById('task-assigned-to');
            if (assignedToSelect && assignedToSelect !== activeElement && assignedToSelect.value !== updatedTask.assignedTo) {
                assignedToSelect.value = updatedTask.assignedTo || '';
                showToast(`Usuario asignado actualizado por otro usuario: ${updatedTask.assignedTo}`, 'info');
            }
            
            // Actualizar chat si hay nuevos mensajes
            if (updatedTask.chat && updatedTask.chat.length > 0) {
                const currentTask = loadTaskObj(OPEN_TASK_ID);
                if (currentTask && currentTask.chat && updatedTask.chat.length > currentTask.chat.length) {
                    renderChat(updatedTask.chat);
                    showToast(`Nuevos mensajes en el chat`, 'info');
                }
            }
            
            console.log('✅ Formulario de tarea actualizado en tiempo real');
        } catch (error) {
            console.error('Error al actualizar formulario en tiempo real:', error);
        }
    }
    
    // 🔄 NUEVA FUNCIÓN: Verificar el estado online de TODOS los usuarios activamente
    async function verifyAllUsersOnlineStatus() {
        try {
            console.log('🔍 Verificando estado online de todos los usuarios...');
            
            // Obtener usuarios actualizados
            const allUsers = await window.api.getUsers();
            const now = new Date();
            let hasChanges = false;
            
            for (const user of allUsers) {
                if (user.username === CURRENT_USER) continue; // Saltar usuario actual
                
                const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
                if (!lastActivity) continue; // Saltar usuarios sin actividad
                
                // Verificar si el usuario está realmente online (últimos 10 segundos)
                const timeSinceLastActivity = now - lastActivity;
                const isReallyOnline = timeSinceLastActivity < 10 * 1000; // 10 segundos
                
                // Si no está realmente online, marcarlo como offline
                if (!isReallyOnline) {
                    // Marcar como offline (última actividad hace más de 5 minutos)
                    const offlineTime = new Date(now.getTime() - 6 * 60 * 1000); // 6 minutos atrás
                    user.lastActivity = offlineTime.toISOString();
                    hasChanges = true;
                    console.log(`🔴 Usuario ${user.username} marcado como offline (inactivo por ${Math.floor(timeSinceLastActivity / 1000)}s)`);
                }
            }
            
            // Si hay cambios, guardar en el archivo
            if (hasChanges) {
                await window.api.writeUsers(allUsers);
                ALL_USERS_CACHE = allUsers;
                
                // Actualizar la interfaz si estamos en gestión de usuarios
                const currentScreen = getCurrentScreen();
                if (currentScreen === 'user-management') {
                    await loadUsers();
                }
                
                console.log('✅ Estados de usuarios actualizados');
            }
        } catch (error) {
            console.error('Error al verificar estados de usuarios:', error);
        }
    }
    
    // 🔒 NUEVA FUNCIÓN: Verificar el estado online de un usuario en tiempo real
    async function checkUserOnlineStatusRealTime(username) {
        try {
            // Si es el usuario actual, siempre está online
            if (username === CURRENT_USER) {
                return true;
            }
            
            // Recargar usuarios desde el archivo para obtener el estado más reciente
            const freshUsers = await window.api.getUsers();
            const userToCheck = freshUsers.find(u => u.username === username);
            
            if (!userToCheck) {
                console.warn(`Usuario ${username} no encontrado al verificar estado online`);
                return false;
            }
            
            // Verificar si tiene actividad reciente (últimos 5 minutos)
            const now = new Date();
            const lastActivity = userToCheck.lastActivity ? new Date(userToCheck.lastActivity) : null;
            const isRecentlyActive = lastActivity && (now - lastActivity) < 5 * 60 * 1000; // 5 minutos
            
            // 🔄 NUEVO: Verificación ULTRA AGRESIVA para eliminación
            // Un usuario está online si ha tenido actividad en los últimos 2 minutos
            // Esto es ULTRA estricto para evitar eliminaciones accidentales
            const isExtremelyRecentlyActive = lastActivity && (now - lastActivity) < 2 * 60 * 1000; // 2 minutos
            
            // 🔄 NUEVO: Verificación de actividad en tareas ULTRA AGRESIVA
            // Comprobar si el usuario ha modificado tareas en los últimos 2 minutos
            // Esto es ULTRA estricto para evitar eliminaciones accidentales
            let hasExtremelyRecentTaskActivity = false;
            try {
                const allTasks = await window.api.readTasks();
                const userTasks = allTasks.filter(task => 
                    task.assignedTo === username || task.createdBy === username
                );
                
                // Verificar si alguna tarea del usuario fue modificada recientemente
                const extremelyRecentTaskActivity = userTasks.some(task => {
                    if (task.lastModified) {
                        const taskModTime = new Date(task.lastModified);
                        return (now - taskModTime) < 2 * 60 * 1000; // 2 minutos
                    }
                    return false;
                });
                
                hasExtremelyRecentTaskActivity = extremelyRecentTaskActivity;
                
                if (hasExtremelyRecentTaskActivity) {
                    console.log(`   - Actividad en tareas reciente: SÍ (últimos 2min)`);
                }
            } catch (taskError) {
                console.warn('No se pudo verificar actividad reciente en tareas:', taskError);
            }
            
            // 🔄 NUEVO: Lógica EXTREMADAMENTE estricta para eliminación
            // Un usuario está online para eliminación si:
            // 1. Ha tenido actividad en los últimos 15 segundos, O
            // 2. Ha modificado tareas en los últimos 15 segundos
            const isOnline = isRecentlyActive; // Para mostrar en la interfaz
            const isOnlineForDeletion = isExtremelyRecentlyActive || hasExtremelyRecentTaskActivity; // EXTREMADAMENTE estricto para eliminación
            
            // Para eliminación, usar el criterio EXTREMADAMENTE estricto (15 segundos)
            const finalOnlineStatus = isOnlineForDeletion;
            
            // 🔄 NUEVO: Log detallado para debugging
            const timeDiff = lastActivity ? Math.floor((now - lastActivity) / 1000) : 'Nunca';
            
            // 🔍 LOG CRÍTICO: Mostrar exactamente por qué se determina el estado
            console.log(`🔍 ANÁLISIS CRÍTICO para eliminación:`);
            console.log(`   - Usuario: ${username}`);
            console.log(`   - Última actividad: ${lastActivity ? lastActivity.toLocaleString() : 'Nunca'}`);
            console.log(`   - Tiempo desde última actividad: ${timeDiff} segundos`);
            console.log(`   - isExtremelyRecentlyActive (2min): ${isExtremelyRecentlyActive}`);
            console.log(`   - hasExtremelyRecentTaskActivity (2min): ${hasExtremelyRecentTaskActivity}`);
            console.log(`   - isOnlineForDeletion: ${isOnlineForDeletion}`);
            console.log(`   - RESULTADO FINAL: ${finalOnlineStatus ? '🟢 ONLINE - NO ELIMINAR' : '🔴 OFFLINE - SE PUEDE ELIMINAR'}`);
            
            // 🔄 NUEVO: Verificación final de seguridad ULTRA AGRESIVA
            // Si el usuario está en el límite (entre 2min-5min), hacer una verificación adicional
            if (!finalOnlineStatus && lastActivity && (now - lastActivity) < 5 * 60 * 1000) {
                console.log(`   - ⚠️ Usuario en zona gris crítica (2min-5min), verificando estado adicional...`);
                
                // Verificar si hay actividad reciente en tareas (últimos 1 minuto)
                try {
                    const allTasks = await window.api.readTasks();
                    const userTasks = allTasks.filter(task => 
                        task.assignedTo === username || task.createdBy === username
                    );
                    
                    const ultraRecentTaskActivity = userTasks.some(task => {
                        if (task.lastModified) {
                            const taskModTime = new Date(task.lastModified);
                            return (now - taskModTime) < 1 * 60 * 1000; // 1 minuto
                        }
                        return false;
                    });
                    
                    if (ultraRecentTaskActivity) {
                        console.log(`   - 🚨 Actividad reciente detectada en tareas (últimos 1min)`);
                        return true; // Usuario definitivamente online
                    }
                } catch (taskError) {
                    console.warn('No se pudo verificar actividad reciente en tareas:', taskError);
                }
            }
            
            console.log(`🔍 Verificación en tiempo real - Usuario: ${username}`);
            console.log(`   - Estado (5min): ${isRecentlyActive ? 'Online' : 'Offline'}`);
            console.log(`   - Estado (2min): ${isExtremelyRecentlyActive ? 'Reciente' : 'No reciente'}`);
            console.log(`   - Actividad en tareas (2min): ${hasExtremelyRecentTaskActivity ? 'SÍ' : 'NO'}`);
            console.log(`   - Estado para eliminación: ${isOnlineForDeletion ? '🟢 Online (NO eliminar)' : '🔴 Offline (se puede eliminar)'}`);
            console.log(`   - Resultado final: ${finalOnlineStatus ? '🟢 Online' : '🔴 Offline'}`);
            
            return finalOnlineStatus;
        } catch (error) {
            console.error('Error al verificar estado online en tiempo real:', error);
            // En caso de error, asumir que está online por seguridad
            return true;
        }
    }
    
    // Función para registrar actividad del usuario actual
    async function recordUserActivity() {
        try {
            // Actualizar la actividad del usuario actual en el archivo de usuarios
            const allUsers = await window.api.getUsers();
            const currentUserIndex = allUsers.findIndex(u => u.username === CURRENT_USER);
            
            if (currentUserIndex !== -1) {
                allUsers[currentUserIndex].lastActivity = new Date().toISOString();
                await window.api.writeUsers(allUsers);
                
                // Actualizar el caché local
                ALL_USERS_CACHE = allUsers;
                
                // 🔄 NUEVO: Forzar una verificación inmediata del estado online
                // y actualizar la interfaz si estamos en la pantalla de gestión de usuarios
                const currentScreen = getCurrentScreen();
                if (currentScreen === 'user-management') {
                    // Actualizar la tabla inmediatamente para mostrar el cambio de estado
                    await loadUsers();
                }
                
                // 🔄 NUEVO: Forzar una verificación del estado online
                updateCurrentUserOnlineStatus();
                
                console.log(`🟢 Actividad registrada para usuario: ${CURRENT_USER} - ${new Date().toLocaleTimeString()}`);
            }
        } catch (error) {
            console.error('Error al registrar actividad del usuario:', error);
        }
    }
});