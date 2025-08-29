// src/ui/tasks.js
// Funciones para la gestión de tareas

import { createTask, getCurrentUserProfile, getSupervisedUsers, getUserTasks, getTaskWithHistory, sendChatMessage, subscribeToTaskHistory, hasActiveSession } from '../api/supabase.js';

/**
 * Muestra un mensaje toast al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje ('success', 'error', 'info')
 */
export const showToast = (message, type = 'info') => {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 transition-opacity duration-300`;
    
    // Aplicar colores según el tipo
    switch (type) {
        case 'success':
            toast.classList.add('bg-emerald-600', 'text-white');
            break;
        case 'error':
            toast.classList.add('bg-rose-600', 'text-white');
            break;
        default:
            toast.classList.add('bg-slate-800', 'text-gray-200');
    }

    // Mostrar toast
    toast.classList.remove('hidden', 'opacity-0');
    toast.style.opacity = '1';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.className = 'hidden'; // Reset classes
        }, 300);
    }, 3000);
};

/**
 * Valida los datos del formulario de nueva tarea
 * @param {object} taskData - Datos de la tarea
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export const validateTaskData = (taskData) => {
    if (!taskData.titulo || taskData.titulo.trim() === '') {
        return 'El título es obligatorio';
    }
    
    if (taskData.titulo.trim().length > 255) {
        return 'El título no puede exceder 255 caracteres';
    }

    const validPriorities = ['Baja', 'Media', 'Alta', 'Urgente'];
    if (!validPriorities.includes(taskData.prioridad)) {
        return 'Prioridad no válida';
    }

    if (!taskData.asignado_a || taskData.asignado_a.trim() === '') {
        return 'Debe asignar la tarea a un usuario';
    }

    return null;
};

/**
 * Obtiene los datos del formulario de nueva tarea
 * @returns {object} - Datos de la tarea
 */
export const getTaskFormData = () => {
    return {
        titulo: document.getElementById('new-title')?.value || '',
        descripcion: document.getElementById('new-desc')?.value || '',
        prioridad: document.getElementById('new-priority')?.value || 'Media',
        asignado_a: document.getElementById('new-assigned-to')?.value || '',
        privada: document.getElementById('new-private')?.checked || false
    };
};

/**
 * Limpia el formulario de nueva tarea
 */
export const clearTaskForm = () => {
    const titleInput = document.getElementById('new-title');
    const descInput = document.getElementById('new-desc');
    const prioritySelect = document.getElementById('new-priority');
    const assignedSelect = document.getElementById('new-assigned-to');
    const privateCheckbox = document.getElementById('new-private');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (prioritySelect) prioritySelect.selectedIndex = 2; // Media por defecto
    if (assignedSelect) assignedSelect.selectedIndex = 0;
    if (privateCheckbox) privateCheckbox.checked = false;
};

/**
 * Maneja la creación de una nueva tarea
 * @param {Event} event - Evento del botón
 */
export const handleCreateTask = async (event) => {
    event.preventDefault();
    
    const createBtn = document.getElementById('btn-create');
    if (!createBtn) return;

    try {
        // Deshabilitar botón durante el proceso
        createBtn.disabled = true;
        createBtn.innerHTML = 'Creando...';
        createBtn.classList.add('opacity-50', 'cursor-not-allowed');

        // Obtener datos del formulario
        const taskData = getTaskFormData();

        // Validar datos
        const validationError = validateTaskData(taskData);
        if (validationError) {
            showToast(validationError, 'error');
            return;
        }

        // Crear la tarea
        const result = await createTask(taskData);

        if (result.success) {
            showToast('Tarea creada correctamente', 'success');
            clearTaskForm();
            
            // Aquí podrías agregar lógica para actualizar la lista de tareas
            // refreshTaskList();
        } else {
            throw new Error(result.error || 'Error desconocido al crear la tarea');
        }

    } catch (error) {
        console.error('Error creando tarea:', error);
        showToast(error.message || 'Error al crear la tarea', 'error');
    } finally {
        // Rehabilitar botón
        createBtn.disabled = false;
        createBtn.innerHTML = 'Crear Tarea';
        createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

/**
 * Carga y actualiza el dropdown de usuarios asignados
 */
export const loadAssignedUsersDropdown = async () => {
    try {
        const assignedSelect = document.getElementById('new-assigned-to');
        if (!assignedSelect) return;

        // Verificar si hay sesión activa antes de continuar
        const sessionActive = await hasActiveSession();
        if (!sessionActive) {
            console.log('No hay sesión activa, omitiendo carga de usuarios');
            return;
        }

        // Obtener usuarios supervisados
        const users = await getSupervisedUsers();
        const currentProfile = await getCurrentUserProfile();

        // Limpiar opciones existentes
        assignedSelect.innerHTML = '';

        // Agregar opción del usuario actual primero
        const currentUserOption = document.createElement('option');
        currentUserOption.value = currentProfile.username;
        currentUserOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
        currentUserOption.selected = true;
        assignedSelect.appendChild(currentUserOption);

        // Agregar otros usuarios supervisados
        users.forEach(user => {
            if (user.id !== currentProfile.id) {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = user.full_name || user.username;
                assignedSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showToast('Error cargando lista de usuarios', 'error');
    }
};

/**
 * Inicializa los event listeners para la gestión de tareas
 */
export const initializeTaskManagement = () => {
    const createBtn = document.getElementById('btn-create');
    
    if (createBtn) {
        createBtn.addEventListener('click', handleCreateTask);
    }

    // Event listener para limpiar errores al escribir en el título
    const titleInput = document.getElementById('new-title');
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            // Aquí podrías agregar validación en tiempo real si lo deseas
        });
    }

    // Cargar usuarios al inicializar
    loadAssignedUsersDropdown();
    
    // Precargar filtros
    preloadFilters();
    
    // Cargar tareas abiertas al inicializar
    loadTasks();
    
    // Event listeners para filtros
    setupFilterEventListeners();
    
    // Inicializar modal de detalles
    initTaskDetailModal();
};

/**
 * Formatea una fecha para mostrar en las tarjetas
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Obtiene el color de la prioridad
 * @param {string} priority - Prioridad de la tarea
 * @returns {string} - Clases CSS para el color
 */
export const getPriorityColor = (priority) => {
    switch (priority) {
        case 'Urgente':
            return 'bg-red-600 text-white';
        case 'Alta':
            return 'bg-orange-600 text-white';
        case 'Media':
            return 'bg-yellow-600 text-white';
        case 'Baja':
            return 'bg-green-600 text-white';
        default:
            return 'bg-gray-600 text-white';
    }
};

/**
 * Obtiene el color del estado
 * @param {string} status - Estado de la tarea
 * @returns {string} - Clases CSS para el color
 */
export const getStatusColor = (status) => {
    switch (status) {
        case 'Sin iniciar':
            return 'bg-gray-600 text-white';
        case 'En progreso':
            return 'bg-blue-600 text-white';
        case 'En espera':
            return 'bg-yellow-600 text-white';
        case 'Finalizada':
            return 'bg-green-600 text-white';
        default:
            return 'bg-gray-600 text-white';
    }
};

/**
 * Crea una tarjeta de tarea para la vista de grid
 * @param {object} task - Objeto de tarea
 * @returns {string} - HTML de la tarjeta
 */
export const createTaskCard = (task) => {
    const priorityColor = getPriorityColor(task.prioridad);
    const statusColor = getStatusColor(task.estado);
    const assignedName = task.assigned_profile?.full_name || task.assigned_profile?.username || 'Sin asignar';
    const creatorName = task.creator_profile?.full_name || task.creator_profile?.username || 'Desconocido';
    const isPrivate = task.privada;
    
    return `
        <div class="bg-slate-800 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer task-card" 
             data-task-id="${task.id}">
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold text-white truncate flex-1 mr-2">${task.titulo}</h3>
                <button class="text-red-400 hover:text-red-300 transition-colors delete-task-btn" 
                        data-task-id="${task.id}" title="Eliminar tarea">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
            
            <div class="space-y-2 text-sm">
                <div class="flex items-center text-slate-300">
                    <span class="font-medium mr-2">Creador:</span>
                    <span>${creatorName}</span>
                </div>
                
                <div class="flex items-center text-slate-300">
                    <span class="font-medium mr-2">Asignada a:</span>
                    <span>${assignedName}</span>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="font-medium mr-2 text-slate-300">Estado:</span>
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                            ${task.estado}
                        </span>
                    </div>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="font-medium mr-2 text-slate-300">Prioridad:</span>
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${priorityColor}">
                            ${task.prioridad}
                        </span>
                    </div>
                    
                    ${isPrivate ? `
                        <div class="flex items-center text-amber-400" title="Tarea privada">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <circle cx="12" cy="16" r="1"></circle>
                                <path d="m7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    ` : `
                        <div class="flex items-center text-slate-400" title="Tarea pública">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="m12 1v6m0 6v6"></path>
                                <path d="m17 7-3 3 3 3"></path>
                                <path d="m7 7 3 3-3 3"></path>
                            </svg>
                        </div>
                    `}
                </div>
                
                <div class="flex items-center text-slate-300 pt-1 border-t border-slate-700">
                    <span class="font-medium mr-2">Última modificación:</span>
                    <span class="text-xs">${formatDate(task.updated_at)}</span>
                </div>
            </div>
        </div>
    `;
};

/**
 * Crea una fila de tarea para la vista de tabla
 * @param {object} task - Objeto de tarea
 * @returns {string} - HTML de la fila
 */
export const createTaskTableRow = (task) => {
    const priorityColor = getPriorityColor(task.prioridad);
    const statusColor = getStatusColor(task.estado);
    const assignedName = task.assigned_profile?.full_name || task.assigned_profile?.username || 'Sin asignar';
    const creatorName = task.creator_profile?.full_name || task.creator_profile?.username || 'Desconocido';
    const isPrivate = task.privada;
    
    return `
        <tr class="hover:bg-slate-700 transition-colors cursor-pointer task-row" data-task-id="${task.id}">
            <td class="py-3 px-4 text-white font-medium">${task.titulo}</td>
            <td class="py-3 px-4 text-slate-300">${creatorName}</td>
            <td class="py-3 px-4 text-slate-300">${assignedName}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${priorityColor}">
                    ${task.prioridad}
                </span>
            </td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                    ${task.estado}
                </span>
            </td>
            <td class="py-3 px-4 text-center">
                ${isPrivate ? `
                    <div class="flex justify-center items-center text-amber-400" title="Tarea privada">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <circle cx="12" cy="16" r="1"></circle>
                            <path d="m7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                ` : `
                    <div class="flex justify-center items-center text-slate-400" title="Tarea pública">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="m12 1v6m0 6v6"></path>
                            <path d="m17 7-3 3 3 3"></path>
                            <path d="m7 7 3 3-3 3"></path>
                        </svg>
                    </div>
                `}
            </td>
            <td class="py-3 px-4 text-slate-300 text-sm">${formatDate(task.updated_at)}</td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                    <button class="text-blue-400 hover:text-blue-300 transition-colors edit-task-btn" 
                            data-task-id="${task.id}" title="Editar tarea">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="text-red-400 hover:text-red-300 transition-colors delete-task-btn" 
                            data-task-id="${task.id}" title="Eliminar tarea">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
};

/**
 * Renderiza las tareas en la vista de grid
 * @param {Array} tasks - Array de tareas
 */
/**
 * Renderiza las tareas en la vista de tabla
 * @param {Array} tasks - Array de tareas
 */
export const renderTaskTable = (tasks) => {
    const tasksTableBody = document.getElementById('tasks-table-body');
    if (!tasksTableBody) return;

    if (tasks.length === 0) {
        tasksTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-slate-400">
                    <div class="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4 opacity-50">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                        <p class="text-lg font-medium mb-2">No hay tareas</p>
                        <p class="text-sm">Crea una nueva tarea para comenzar</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tasksTableBody.innerHTML = tasks.map(task => createTaskTableRow(task)).join('');
    
    // Agregar event listeners para las filas de la tabla
    tasks.forEach(task => {
        const taskRow = document.querySelector(`.task-row[data-task-id="${task.id}"]`);
        if (taskRow) {
            taskRow.addEventListener('click', (e) => {
                // Solo abrir el modal si no se hizo clic en un botón
                if (!e.target.closest('button')) {
                    openTaskDetailModal(task.id);
                }
            });
        }
        
        // Event listener para el botón de editar
        const editBtn = document.querySelector(`.edit-task-btn[data-task-id="${task.id}"]`);
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTaskDetailModal(task.id);
            });
        }
    });
};

export const renderTaskCards = (tasks) => {
    const tasksGrid = document.getElementById('tasks-grid');
    if (!tasksGrid) return;

    if (tasks.length === 0) {
        tasksGrid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                <h3 class="text-lg font-medium mb-2">No hay tareas</h3>
                <p>No se encontraron tareas con los filtros aplicados.</p>
            </div>
        `;
        return;
    }

    const cardsHTML = tasks.map(task => createTaskCard(task)).join('');
    tasksGrid.innerHTML = cardsHTML;

    // Agregar event listeners a las tarjetas
    addTaskCardEventListeners();
};

/**
 * Agrega event listeners a las tarjetas de tareas
 */
export const addTaskCardEventListeners = () => {
    // Event listeners para tarjetas de tareas
    document.addEventListener('click', (e) => {
        if (e.target.closest('.task-card')) {
            const taskId = e.target.closest('.task-card').dataset.taskId;
            if (taskId) {
                openTaskDetailModal(taskId);
            }
        }
        
        if (e.target.closest('.delete-task-btn')) {
            e.stopPropagation(); // Evitar que se abra el modal
            const taskId = e.target.closest('.delete-task-btn').dataset.taskId;
            if (taskId) {
                // TODO: Implementar eliminación de tarea
                console.log('Eliminar tarea:', taskId);
            }
        }
    });
};

/**
 * Abre el modal de detalle de tarea (función legacy)
 * @param {string} taskId - ID de la tarea
 */
export const openTaskDetail = (taskId) => {
    openTaskDetailModal(taskId);
};

/**
 * Carga y muestra las tareas según los filtros aplicados
 */
export const loadTasks = async () => {
    try {
        // Verificar si hay sesión activa antes de continuar
        const sessionActive = await hasActiveSession();
        if (!sessionActive) {
            console.log('No hay sesión activa, redirigiendo al login');
            return;
        }

        const tasks = await getUserTasks();
        
        // Almacenar las tareas globalmente para el cambio de vista
        window.currentTasks = tasks;
        
        // Renderizar según el modo de vista actual
        renderCurrentTasks();
        
        // Agregar event listeners después de renderizar
        addTaskCardEventListeners();
        
    } catch (error) {
        console.error('Error cargando tareas:', error);
        showToast('Error cargando las tareas', 'error');
    }
};

/**
 * Precarga los filtros con datos del usuario
 */
export const preloadFilters = async () => {
    try {
        // Verificar si hay sesión activa antes de continuar
        const sessionActive = await hasActiveSession();
        if (!sessionActive) {
            console.log('No hay sesión activa, omitiendo precarga de filtros');
            return;
        }

        // Cargar usuarios supervisados en el filtro de asignación
        const users = await getSupervisedUsers();
        const currentProfile = await getCurrentUserProfile();
        const assignedFilter = document.getElementById('filter-assigned-to');
        
        if (assignedFilter) {
            // Limpiar opciones existentes excepto "Todos"
            const allOption = assignedFilter.querySelector('option[value=""]');
            assignedFilter.innerHTML = '';
            if (allOption) assignedFilter.appendChild(allOption);
            
            // Agregar usuarios
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = user.full_name || user.username;
                if (user.id === currentProfile.id) {
                    option.textContent += ' (Yo)';
                    option.selected = true; // Seleccionar usuario actual por defecto
                }
                assignedFilter.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error precargando filtros:', error);
    }
};

/**
 * Configura los event listeners para los filtros
 */
export const setupFilterEventListeners = () => {
    // Event listeners para recargar tareas cuando cambien los filtros
    const filterElements = [
        'filter-state',
        'filter-priority', 
        'filter-assigned-to',
        'filter-text'
    ];

    filterElements.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', renderCurrentTasks);
            if (filterId === 'filter-text') {
                // Para el campo de texto, usar input con debounce
                let timeout;
                element.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(renderCurrentTasks, 300);
                });
            }
        }
    });

    // Event listener para resetear filtros
    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Resetear todos los filtros
            document.getElementById('filter-text').value = '';
            document.getElementById('filter-state').value = 'OPEN_TASKS';
            document.getElementById('filter-priority').value = '';
            document.getElementById('filter-assigned-to').value = '';
            
            // Recargar tareas
            renderCurrentTasks();
        });
    }
};

// Variables globales para el modal de detalles
let currentTaskId = null;
let taskHistorySubscription = null;

/**
 * Abre el modal de detalles de tarea
 * @param {string} taskId - ID de la tarea
 */
export const openTaskDetailModal = async (taskId) => {
    try {
        currentTaskId = taskId;
        
        // Obtener datos de la tarea con historial
        const { task, history } = await getTaskWithHistory(taskId);
        
        // Cargar datos en el formulario
        await loadTaskDetailsForm(task);
        
        // Cargar historial y chat
        loadTaskHistory(history);
        
        // Configurar suscripción en tiempo real
        setupRealtimeSubscription(taskId);
        
        // Mostrar modal
        const modal = document.getElementById('task-detail-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
    } catch (error) {
        console.error('Error abriendo modal de tarea:', error);
        showToast('Error al cargar los detalles de la tarea', 'error');
    }
};

/**
 * Cierra el modal de detalles de tarea
 */
export const closeTaskDetailModal = () => {
    const modal = document.getElementById('task-detail-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Limpiar suscripción
    if (taskHistorySubscription) {
        taskHistorySubscription.unsubscribe();
        taskHistorySubscription = null;
    }
    
    currentTaskId = null;
};

/**
 * Carga los datos de la tarea en el formulario
 * @param {object} task - Datos de la tarea
 */
const loadTaskDetailsForm = async (task) => {
    // Cargar datos básicos
    document.getElementById('task-detail-title').value = task.titulo || '';
    document.getElementById('task-detail-description').value = task.descripcion || '';
    document.getElementById('task-detail-status').value = task.estado || 'Sin iniciar';
    document.getElementById('task-detail-priority').value = task.prioridad || 'Media';
    document.getElementById('task-detail-private').checked = task.privada || false;
    
    // Cargar dropdown de usuarios asignados
    await loadTaskDetailAssignedUsers(task.asignado_a);
};

/**
 * Carga el dropdown de usuarios para asignación en el modal
 * @param {string} currentAssignedId - ID del usuario actualmente asignado
 */
const loadTaskDetailAssignedUsers = async (currentAssignedId) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        const supervisedUsers = await getSupervisedUsers();
        
        const assignedSelect = document.getElementById('task-detail-assigned');
        assignedSelect.innerHTML = '';
        
        // Agregar usuario actual
        const currentOption = document.createElement('option');
        currentOption.value = currentProfile.id;
        currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
        if (currentAssignedId === currentProfile.id) {
            currentOption.selected = true;
        }
        assignedSelect.appendChild(currentOption);
        
        // Agregar usuarios supervisados
        supervisedUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name || user.username;
            if (currentAssignedId === user.id) {
                option.selected = true;
            }
            assignedSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando usuarios para asignación:', error);
    }
};

/**
 * Carga el historial de la tarea en el chat
 * @param {Array} history - Historial de la tarea
 */
const loadTaskHistory = (history) => {
    const chatContainer = document.getElementById('task-chat-messages');
    chatContainer.innerHTML = '';
    
    history.forEach(entry => {
        const messageElement = createHistoryMessage(entry);
        chatContainer.appendChild(messageElement);
    });
    
    // Scroll al final
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

/**
 * Crea un elemento de mensaje para el historial/chat
 * @param {object} entry - Entrada del historial
 * @returns {HTMLElement} - Elemento del mensaje
 */
const createHistoryMessage = (entry) => {
    const messageDiv = document.createElement('div');
    const isCurrentUser = entry.usuario_profile?.id === getCurrentUserProfile()?.id;
    const isChatMessage = entry.campo_modificado === 'chat_message';
    
    if (isChatMessage) {
        // Mensaje de chat estilo WhatsApp
        messageDiv.className = `flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isCurrentUser 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-700 text-slate-200'
        }`;
        
        const userName = document.createElement('div');
        userName.className = 'text-xs font-medium mb-1';
        userName.textContent = entry.usuario_profile?.full_name || entry.usuario_profile?.username || 'Usuario';
        
        const messageText = document.createElement('div');
        messageText.className = 'text-sm';
        messageText.textContent = entry.valor_nuevo;
        
        const timeText = document.createElement('div');
        timeText.className = 'text-xs opacity-75 mt-1 text-right';
        timeText.textContent = formatTime(entry.created_at);
        
        bubble.appendChild(userName);
        bubble.appendChild(messageText);
        bubble.appendChild(timeText);
        messageDiv.appendChild(bubble);
        
    } else {
        // Mensaje de historial en cursiva
        messageDiv.className = 'text-center';
        
        const historyText = document.createElement('div');
        historyText.className = 'text-sm text-slate-400 italic bg-slate-800 px-3 py-2 rounded-lg inline-block';
        
        if (entry.comentario) {
            historyText.textContent = entry.comentario;
        } else {
            const userName = entry.usuario_profile?.full_name || entry.usuario_profile?.username || 'Usuario';
            const time = formatTime(entry.created_at);
            historyText.textContent = `[${userName}] ${entry.campo_modificado}: ${entry.valor_nuevo} (${time})`;
        }
        
        messageDiv.appendChild(historyText);
    }
    
    return messageDiv;
};

/**
 * Configura la suscripción en tiempo real para el historial
 * @param {string} taskId - ID de la tarea
 */
const setupRealtimeSubscription = (taskId) => {
    // Limpiar suscripción anterior si existe
    if (taskHistorySubscription) {
        taskHistorySubscription.unsubscribe();
    }
    
    // Crear nueva suscripción
    taskHistorySubscription = subscribeToTaskHistory(taskId, (newEntry) => {
        const chatContainer = document.getElementById('task-chat-messages');
        const messageElement = createHistoryMessage(newEntry);
        chatContainer.appendChild(messageElement);
        
        // Scroll al final
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
};

/**
 * Envía un mensaje de chat
 */
const sendChatMessageHandler = async () => {
    const messageInput = document.getElementById('chat-message-input');
    const message = messageInput.value.trim();
    
    if (!message || !currentTaskId) return;
    
    try {
        await sendChatMessage(currentTaskId, message);
        messageInput.value = '';
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        showToast('Error al enviar mensaje', 'error');
    }
};

/**
 * Formatea la hora para mostrar en los mensajes
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} - Hora formateada
 */
const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Inicializa los event listeners del modal de detalles
 */
export const initTaskDetailModal = () => {
    // Cerrar modal
    const closeBtn = document.getElementById('btn-close-task-detail-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTaskDetailModal);
    }
    
    // Enviar mensaje de chat
    const sendBtn = document.getElementById('btn-send-chat-message');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessageHandler);
    }
    
    // Enviar con Enter
    const messageInput = document.getElementById('chat-message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessageHandler();
            }
        });
    }
    
    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('task-detail-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTaskDetailModal();
            }
        });
    }
};

// Variable para controlar el modo de vista actual
let currentViewMode = 'cards'; // 'cards' o 'table'

/**
 * Alterna entre vista de tarjetas y tabla
 */
export const toggleViewMode = () => {
    const tasksGrid = document.getElementById('tasks-grid');
    const tasksTable = document.getElementById('tasks-table');
    const viewModeText = document.getElementById('view-mode-text');
    const iconCards = document.getElementById('icon-cards');
    const iconTable = document.getElementById('icon-table');
    
    if (currentViewMode === 'cards') {
        // Cambiar a vista de tabla
        currentViewMode = 'table';
        tasksGrid.classList.add('hidden');
        tasksTable.classList.remove('hidden');
        viewModeText.textContent = 'Vista de Tarjetas';
        
        // Cambiar iconos
        if (iconCards) iconCards.classList.remove('hidden');
        if (iconTable) iconTable.classList.add('hidden');
        
        // Renderizar tareas en tabla
        renderCurrentTasks();
    } else {
        // Cambiar a vista de tarjetas
        currentViewMode = 'cards';
        tasksTable.classList.add('hidden');
        tasksGrid.classList.remove('hidden');
        viewModeText.textContent = 'Vista de Tabla';
        
        // Cambiar iconos
        if (iconTable) iconTable.classList.remove('hidden');
        if (iconCards) iconCards.classList.add('hidden');
        
        // Renderizar tareas en tarjetas
        renderCurrentTasks();
    }
};

/**
 * Obtiene las tareas filtradas según los criterios de búsqueda
 */
export const getFilteredTasks = () => {
    const allTasks = window.currentTasks || [];
    
    // Obtener valores de los filtros
    const textFilter = document.getElementById('filter-text')?.value.toLowerCase() || '';
    const stateFilter = document.getElementById('filter-state')?.value || '';
    const priorityFilter = document.getElementById('filter-priority')?.value || '';
    const assignedFilter = document.getElementById('filter-assigned-to')?.value || '';
    
    return allTasks.filter(task => {
        // Filtro de texto (busca en título y descripción)
        const matchesText = !textFilter || 
            task.titulo.toLowerCase().includes(textFilter) ||
            (task.descripcion && task.descripcion.toLowerCase().includes(textFilter));
        
        // Filtro de estado
        let matchesState = true;
        if (stateFilter === 'OPEN_TASKS') {
            matchesState = task.estado !== 'Finalizada';
        } else if (stateFilter === 'COMPLETED_TASKS') {
            matchesState = task.estado === 'Finalizada';
        } else if (stateFilter && stateFilter !== '') {
            matchesState = task.estado === stateFilter;
        }
        
        // Filtro de prioridad
        const matchesPriority = !priorityFilter || task.prioridad === priorityFilter;
        
        // Filtro de asignación
        const matchesAssigned = !assignedFilter || task.assigned_to === assignedFilter;
        
        return matchesText && matchesState && matchesPriority && matchesAssigned;
    });
};

/**
 * Renderiza las tareas actuales según el modo de vista
 */
export const renderCurrentTasks = () => {
    // Usar las tareas filtradas
    const tasks = getFilteredTasks();
    
    if (currentViewMode === 'cards') {
        renderTaskCards(tasks);
    } else {
        renderTaskTable(tasks);
    }
};
