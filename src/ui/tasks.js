// src/ui/tasks.js
// Funciones para la gestión de tareas

import { createTask, getCurrentUserProfile, getSupervisedUsers, getUserTasks } from '../api/supabase.js';

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
 * Crea una tarjeta de tarea para la vista de grid
 * @param {object} task - Objeto de tarea
 * @returns {string} - HTML de la tarjeta
 */
export const createTaskCard = (task) => {
    const priorityColor = getPriorityColor(task.prioridad);
    const assignedName = task.assigned_profile?.full_name || task.assigned_profile?.username || 'Sin asignar';
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
                    <span class="font-medium mr-2">Asignada a:</span>
                    <span>${assignedName}</span>
                </div>
                
                <div class="flex items-center text-slate-300">
                    <span class="font-medium mr-2">Última modificación:</span>
                    <span>${formatDate(task.updated_at)}</span>
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
                    ` : ''}
                </div>
            </div>
        </div>
    `;
};

/**
 * Renderiza las tareas en la vista de grid
 * @param {Array} tasks - Array de tareas
 */
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
    // Event listeners para abrir detalle de tarea
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // No abrir si se clickeó el botón de eliminar
            if (e.target.closest('.delete-task-btn')) return;
            
            const taskId = card.dataset.taskId;
            openTaskDetail(taskId);
        });
    });

    // Event listeners para botones de eliminar (placeholder)
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = btn.dataset.taskId;
            // TODO: Implementar eliminación de tarea
            showToast('Función de eliminar tarea pendiente de implementar', 'info');
        });
    });
};

/**
 * Abre el modal de detalle de tarea
 * @param {string} taskId - ID de la tarea
 */
export const openTaskDetail = (taskId) => {
    // TODO: Implementar apertura del modal con datos de la tarea
    console.log('Abriendo detalle de tarea:', taskId);
    
    // Por ahora, mostrar el modal existente
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        showToast('Modal de detalle pendiente de implementar completamente', 'info');
    }
};

/**
 * Carga y muestra las tareas según los filtros aplicados
 */
export const loadTasks = async () => {
    try {
        // Obtener filtros actuales
        const filterStatus = document.getElementById('filter-state')?.value || 'OPEN_TASKS';
        const filters = {
            priority: document.getElementById('filter-priority')?.value || '',
            assigned_to: document.getElementById('filter-assigned-to')?.value || '',
            text: document.getElementById('filter-text')?.value || ''
        };

        // Obtener tareas
        const tasks = await getUserTasks(filterStatus, filters);
        
        // Renderizar en vista actual
        renderTaskCards(tasks);
        
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
            element.addEventListener('change', loadTasks);
            if (filterId === 'filter-text') {
                // Para el campo de texto, usar input con debounce
                let timeout;
                element.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(loadTasks, 300);
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
            loadTasks();
        });
    }
};
