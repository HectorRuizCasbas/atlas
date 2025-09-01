// src/ui/tasks.js
// Funciones para la gestión de tareas

import { 
    createTask, 
    getUserTasks, 
    getTaskWithHistory, 
    sendChatMessage, 
    subscribeToTaskHistory, 
    getSupervisedUsers, 
    getUsersByDepartment,
    getCurrentUserProfile,
    getDepartments,
    updateTaskWithHistory,
    hasActiveSession
} from '../api/supabase.js';

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
 * @param {object} currentProfile - Perfil del usuario actual
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export const validateTaskData = async (taskData) => {
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

    // Obtener perfil del usuario actual para validar asignación
    const currentProfile = await getCurrentUserProfile();
    
    // Validar asignación según las reglas de negocio
    if (['Coordinador', 'Responsable'].includes(currentProfile.role)) {
        // Para coordinadores y responsables
        if (taskData.departamento === currentProfile.departamento_id) {
            // Tarea para su propio departamento - debe tener asignación
            if (!taskData.assigned_to || taskData.assigned_to.trim() === '') {
                return 'Debe asignar la tarea a un usuario de su departamento';
            }
        }
        // Para otro departamento - puede quedar sin asignar (no validamos assigned_to)
    } else if (currentProfile.role === 'Usuario') {
        // Usuarios estándar - siempre deben asignarse a sí mismos
        if (!taskData.assigned_to || taskData.assigned_to !== currentProfile.id) {
            return 'Debe asignarse la tarea a usted mismo';
        }
    }
    // Administradores pueden crear tareas con o sin asignación

    return null;
};

/**
 * Obtiene los datos del formulario de nueva tarea
 * @returns {object} - Datos de la tarea
 */
export const getTaskFormData = async () => {
    const assignedUserId = document.getElementById('new-assigned-to')?.value || null;
    let departmentId = document.getElementById('new-department')?.value || null;
    
    // Debug: Log form values
    console.log('getTaskFormData: assigned_to value from form:', assignedUserId);
    console.log('getTaskFormData: department value from form:', departmentId);
    
    // Si no se especifica departamento, usar el del usuario actual como fallback
    if (!departmentId) {
        try {
            const currentProfile = await getCurrentUserProfile();
            if (currentProfile.departamento_id) {
                departmentId = currentProfile.departamento_id;
            }
        } catch (error) {
            console.error('Error obteniendo departamento del usuario actual:', error);
        }
    }
    
    // Si hay usuario asignado y es de otro departamento, usar su departamento
    if (assignedUserId && departmentId) {
        try {
            const users = await getSupervisedUsers();
            const assignedUser = users.find(user => user.id === assignedUserId);
            console.log('getTaskFormData: Found assigned user:', assignedUser);
            if (assignedUser && assignedUser.departamento_id && assignedUser.departamento_id !== departmentId) {
                departmentId = assignedUser.departamento_id;
            }
        } catch (error) {
            console.error('Error obteniendo departamento del usuario asignado:', error);
        }
    }
    
    const taskData = {
        titulo: document.getElementById('new-title')?.value || '',
        descripcion: document.getElementById('new-desc')?.value || '',
        prioridad: document.getElementById('new-priority')?.value || 'Media',
        departamento: departmentId,
        assigned_to: assignedUserId,
        privada: document.getElementById('new-private')?.checked || false
    };
    
    console.log('getTaskFormData: Final task data:', JSON.stringify(taskData, null, 2));
    return taskData;
};
/**
 * Limpia el formulario de nueva tarea
 */
export const clearTaskForm = async () => {
    const titleInput = document.getElementById('new-title');
    const descInput = document.getElementById('new-desc');
    const prioritySelect = document.getElementById('new-priority');
    const privateCheckbox = document.getElementById('new-private');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (prioritySelect) prioritySelect.selectedIndex = 2; // Media por defecto
    if (privateCheckbox) privateCheckbox.checked = false;
    
    // Recargar departamentos y usuarios para resetear a valores por defecto
    await loadDepartmentsDropdown();
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
        const taskData = await getTaskFormData();

        // Validar datos
        const validationError = await validateTaskData(taskData);
        if (validationError) {
            showToast(validationError, 'error');
            return;
        }

        // Crear la tarea
        const result = await createTask(taskData);

        if (result.success) {
            showToast('Tarea creada correctamente', 'success');
            clearTaskForm();
            
            // Actualizar la lista de tareas para mostrar la nueva tarea
            await loadTasks();
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
        currentUserOption.value = currentProfile.id;
        currentUserOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
        currentUserOption.selected = true;
        assignedSelect.appendChild(currentUserOption);

        // Agregar otros usuarios supervisados
        users.forEach(user => {
            if (user.id !== currentProfile.id) {
                const option = document.createElement('option');
                option.value = user.id;
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
 * Carga los departamentos disponibles según el rol del usuario
 */
export const loadDepartmentsDropdown = async () => {
    try {
        const departmentSelect = document.getElementById('new-department');
        if (!departmentSelect) return;

        const currentProfile = await getCurrentUserProfile();
        const departments = await getDepartments();

        // Limpiar opciones existentes
        departmentSelect.innerHTML = '';

        // No agregar opción "Sin departamento" - todas las tareas deben tener departamento

        // Lógica según el rol del usuario
        if (currentProfile.role === 'Administrador') {
            // Administradores pueden elegir cualquier departamento
            departmentSelect.disabled = false;
            departmentSelect.classList.remove('opacity-50', 'cursor-not-allowed');
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.nombre;
                departmentSelect.appendChild(option);
            });
        } else if (['Coordinador', 'Responsable'].includes(currentProfile.role)) {
            // Coordinadores y Responsables pueden elegir su departamento y otros
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.nombre;
                if (dept.id === currentProfile.departamento_id) {
                    option.selected = true;
                }
                departmentSelect.appendChild(option);
            });
        } else if (currentProfile.role === 'Usuario' && currentProfile.departamento_id) {
            // Usuarios estándar solo pueden elegir su departamento (bloqueado)
            const userDept = departments.find(d => d.id === currentProfile.departamento_id);
            if (userDept) {
                const option = document.createElement('option');
                option.value = userDept.id;
                option.textContent = userDept.nombre;
                option.selected = true;
                departmentSelect.appendChild(option);
                departmentSelect.disabled = true;
                departmentSelect.classList.add('opacity-50', 'cursor-not-allowed');
            }
        } else {
            // Usuarios sin departamento - solo "Sin departamento" (bloqueado)
            departmentSelect.disabled = true;
            departmentSelect.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // Configurar el dropdown de usuarios basado en el departamento seleccionado
        await updateAssignedUsersBasedOnDepartment();

    } catch (error) {
        console.error('Error cargando departamentos:', error);
        showToast('Error cargando lista de departamentos', 'error');
    }
};

/**
 * Actualiza el dropdown de usuarios asignados basado en el departamento seleccionado
 */
export const updateAssignedUsersBasedOnDepartment = async () => {
    try {
        const departmentSelect = document.getElementById('new-department');
        const assignedSelect = document.getElementById('new-assigned-to');
        if (!departmentSelect || !assignedSelect) return;

        const selectedDepartmentId = departmentSelect.value;
        const currentProfile = await getCurrentUserProfile();

        // Limpiar opciones existentes
        assignedSelect.innerHTML = '';

        // Agregar opción "Sin usuario asignado"
        const noUserOption = document.createElement('option');
        noUserOption.value = '';
        noUserOption.textContent = 'Sin usuario asignado';
        assignedSelect.appendChild(noUserOption);

        if (currentProfile.role === 'Usuario') {
            // 1. USUARIOS ESTÁNDAR - Bloqueados con su departamento y su usuario
            const currentOption = document.createElement('option');
            currentOption.value = currentProfile.id;
            currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
            currentOption.selected = true;
            assignedSelect.appendChild(currentOption);
            assignedSelect.disabled = true;
            assignedSelect.classList.add('opacity-50', 'cursor-not-allowed');
            
        } else if (['Coordinador', 'Responsable'].includes(currentProfile.role)) {
            // 2. COORDINADORES Y RESPONSABLES
            if (selectedDepartmentId === currentProfile.departamento_id) {
                // Su propio departamento - desbloquear y mostrar usuarios del departamento
                assignedSelect.disabled = false;
                assignedSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                
                const users = await getUsersByDepartment(selectedDepartmentId);
                
                // Agregar usuario actual
                const currentOption = document.createElement('option');
                currentOption.value = currentProfile.id;
                currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
                assignedSelect.appendChild(currentOption);

                // Agregar otros usuarios del departamento
                users.forEach(user => {
                    if (user.id !== currentProfile.id) {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.full_name || user.username;
                        assignedSelect.appendChild(option);
                    }
                });
            } else {
                // Departamento diferente o sin departamento - bloquear en "Sin usuario asignado"
                assignedSelect.disabled = true;
                assignedSelect.classList.add('opacity-50', 'cursor-not-allowed');
                assignedSelect.value = ''; // Sin usuario asignado
                noUserOption.selected = true;
            }
            
        } else if (currentProfile.role === 'Administrador') {
            // 3. ADMINISTRADORES - Siempre desbloqueado, mostrar usuarios del departamento seleccionado
            assignedSelect.disabled = false;
            assignedSelect.classList.remove('opacity-50', 'cursor-not-allowed');
            
            if (selectedDepartmentId) {
                // Departamento seleccionado - mostrar usuarios de ese departamento
                const users = await getUsersByDepartment(selectedDepartmentId);
                
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.full_name || user.username;
                    if (user.id === currentProfile.id) {
                        option.textContent += ' (Yo)';
                    }
                    assignedSelect.appendChild(option);
                });
            } else {
                // Sin departamento - mostrar todos los usuarios disponibles
                const allUsers = await getSupervisedUsers();
                
                // Agregar administrador actual primero
                const currentOption = document.createElement('option');
                currentOption.value = currentProfile.id;
                currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
                assignedSelect.appendChild(currentOption);
                
                // Agregar otros usuarios
                allUsers.forEach(user => {
                    if (user.id !== currentProfile.id) {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.full_name || user.username;
                        assignedSelect.appendChild(option);
                    }
                });
            }
        }

        // Actualizar lógica del checkbox privado
        updatePrivateCheckboxLogic();

    } catch (error) {
        console.error('Error actualizando usuarios asignados:', error);
    }
};

/**
 * Actualiza la lógica del checkbox de tarea privada
 */
export const updatePrivateCheckboxLogic = async () => {
    try {
        const privateCheckbox = document.getElementById('new-private');
        const departmentSelect = document.getElementById('new-department');
        const assignedSelect = document.getElementById('new-assigned-to');
        if (!privateCheckbox || !departmentSelect || !assignedSelect) return;

        const currentProfile = await getCurrentUserProfile();
        const selectedDepartmentId = departmentSelect.value;
        const selectedUserId = assignedSelect.value;

        // Reset checkbox state
        privateCheckbox.disabled = false;
        privateCheckbox.checked = false;
        privateCheckbox.parentElement.classList.remove('opacity-50');

        if (currentProfile.role === 'Usuario' && !currentProfile.departamento_id) {
            // Usuarios sin departamento - siempre privado y bloqueado
            privateCheckbox.checked = true;
            privateCheckbox.disabled = true;
            privateCheckbox.parentElement.classList.add('opacity-50');
        } else {
            // Para otros roles - solo puede ser privada si:
            // 1. El departamento seleccionado es el del usuario actual (o sin departamento)
            // 2. El usuario asignado es el usuario actual
            const canBePrivate = (
                (selectedDepartmentId === currentProfile.departamento_id || selectedDepartmentId === '') &&
                selectedUserId === currentProfile.id
            );

            if (!canBePrivate) {
                privateCheckbox.checked = false;
                privateCheckbox.disabled = true;
                privateCheckbox.parentElement.classList.add('opacity-50');
            }
        }

    } catch (error) {
        console.error('Error actualizando lógica de checkbox privado:', error);
    }
};

/**
 * Configura los event listeners para el formulario de creación de tareas
 */
export const setupTaskFormEventListeners = () => {
    const departmentSelect = document.getElementById('new-department');
    const assignedSelect = document.getElementById('new-assigned-to');
    
    if (departmentSelect) {
        departmentSelect.addEventListener('change', updateAssignedUsersBasedOnDepartment);
    }
    
    if (assignedSelect) {
        assignedSelect.addEventListener('change', updatePrivateCheckboxLogic);
    }
};

/**
 * Inicializa los event listeners para la gestión de tareas
 */
export const initializeTaskManagement = async () => {
    const createBtn = document.getElementById('btn-create');
    
    if (createBtn) {
        createBtn.addEventListener('click', handleCreateTask);
    }
    
    // Cargar departamentos y configurar formulario
    await loadDepartmentsDropdown();
    
    // Configurar event listeners del formulario
    setupTaskFormEventListeners();
    
    // Precarga de filtros y establecer valores por defecto
    await preloadFilters();
    await setDefaultFilterValues();
    
    // Cargar tareas abiertas al inicializar
    await loadTasks();
    
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
    const departmentName = task.assigned_profile?.departamentos?.nombre || task.creator_profile?.departamentos?.nombre || 'Sin departamento';
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
                
                <div class="flex items-center text-slate-300">
                    <span class="font-medium mr-2">Departamento:</span>
                    <span>${departmentName}</span>
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
    const departmentName = task.assigned_profile?.departamentos?.nombre || task.creator_profile?.departamentos?.nombre || 'Sin departamento';
    const isPrivate = task.privada;
    
    return `
        <tr class="hover:bg-slate-700 transition-colors cursor-pointer task-row" data-task-id="${task.id}">
            <td class="py-3 px-4 text-white font-medium">${task.titulo}</td>
            <td class="py-3 px-4 text-slate-300">${creatorName}</td>
            <td class="py-3 px-4 text-slate-300">${assignedName}</td>
            <td class="py-3 px-4 text-slate-300">${departmentName}</td>
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

        // Obtener filtros actuales
        const filters = getCurrentFilters();
        const tasks = await getUserTasks(filters.state, {
            priority: filters.priority,
            assigned_to: filters.assigned_to,
            text: filters.text,
            department: filters.department
        });
        
        // Almacenar las tareas globalmente para el cambio de vista
        window.currentTasks = tasks;
        
        // Renderizar según el modo de vista actual
        renderCurrentTasks();
        
        // Agregar event listeners después de renderizar
        addTaskCardEventListeners();
        
    } catch (error) {
        console.error('Error cargando tareas:', error);
        showToast('Error cargando las tareas', 'error');
        
        // Limpiar tareas en caso de error
        window.currentTasks = [];
        
        // Limpiar la vista de tareas
        const tasksList = document.getElementById('tasks-list');
        const tasksGrid = document.getElementById('tasks-grid');
        if (tasksList) tasksList.innerHTML = '<div class="text-center text-slate-400 py-8">Error al cargar las tareas</div>';
        if (tasksGrid) tasksGrid.innerHTML = '<div class="text-center text-slate-400 py-8">Error al cargar las tareas</div>';
    }
};

/**
 * Obtiene los valores actuales de los filtros
 * @returns {object} - Objeto con los valores de los filtros
 */
const getCurrentFilters = () => {
    const textFilter = document.getElementById('filter-text');
    const stateFilter = document.getElementById('filter-state');
    const assignedFilter = document.getElementById('filter-assigned-to');
    const departmentFilter = document.getElementById('filter-department');
    
    return {
        text: textFilter?.value || '',
        state: stateFilter?.value || 'OPEN_TASKS',
        assigned_to: assignedFilter?.value || '',
        department: departmentFilter?.value || ''
    };
};

/**
 * Establece los valores por defecto de los filtros
 */
export const setDefaultFilterValues = async () => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Establecer valores por defecto
        const textFilter = document.getElementById('filter-text');
        const stateFilter = document.getElementById('filter-state');
        const assignedFilter = document.getElementById('filter-assigned-to');
        
        if (textFilter) textFilter.value = '';
        if (stateFilter) stateFilter.value = 'OPEN_TASKS';
        if (assignedFilter && currentProfile) assignedFilter.value = currentProfile.id;
        
    } catch (error) {
        console.error('Error estableciendo valores por defecto:', error);
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
            // Limpiar opciones existentes
            assignedFilter.innerHTML = '';
            
            // Agregar opción "Todos"
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'Todos';
            assignedFilter.appendChild(allOption);
            
            // Agregar usuario actual primero
            const currentOption = document.createElement('option');
            currentOption.value = currentProfile.id;
            currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
            currentOption.selected = true; // Seleccionar usuario actual por defecto
            assignedFilter.appendChild(currentOption);
            
            // Agregar otros usuarios supervisados
            users.forEach(user => {
                if (user.id !== currentProfile.id) {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.full_name || user.username;
                    assignedFilter.appendChild(option);
                }
            });
        }

        // Cargar filtro de departamentos solo para administradores
        const departmentFilterContainer = document.getElementById('filter-department-container');
        const departmentFilter = document.getElementById('filter-department');
        
        // Cargar filtro de departamentos para todos los roles
        if (departmentFilterContainer && departmentFilter) {
            // Mostrar el filtro de departamentos
            departmentFilterContainer.classList.remove('hidden');
            
            // Cargar departamentos
            const departments = await getDepartments();
            
            // Limpiar opciones existentes
            departmentFilter.innerHTML = '';
            
            // Agregar opción "Todos"
            const allDeptOption = document.createElement('option');
            allDeptOption.value = '';
            allDeptOption.textContent = 'Todos';
            departmentFilter.appendChild(allDeptOption);
            
            // Agregar departamentos según el rol
            if (currentProfile.role === 'Administrador') {
                // Administradores ven todos los departamentos
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.nombre;
                    departmentFilter.appendChild(option);
                });
            } else if (['Responsable', 'Coordinador'].includes(currentProfile.role)) {
                // Responsables y Coordinadores ven todos los departamentos
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.nombre;
                    // Preseleccionar su departamento
                    if (dept.id === currentProfile.departamento_id) {
                        option.selected = true;
                    }
                    departmentFilter.appendChild(option);
                });
            } else {
                // Usuarios estándar solo ven su departamento
                const userDept = departments.find(d => d.id === currentProfile.departamento_id);
                if (userDept) {
                    const option = document.createElement('option');
                    option.value = userDept.id;
                    option.textContent = userDept.nombre;
                    option.selected = true;
                    departmentFilter.appendChild(option);
                }
            }
        }
        
    } catch (error) {
        console.error('Error precargando filtros:', error);
        
        // En caso de error, limpiar los filtros para evitar mostrar datos incorrectos
        const assignedFilter = document.getElementById('filter-assigned-to');
        const departmentFilter = document.getElementById('filter-department');
        
        if (assignedFilter) {
            assignedFilter.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Todos';
            assignedFilter.appendChild(defaultOption);
        }
        
        if (departmentFilter) {
            departmentFilter.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Todos los departamentos';
            departmentFilter.appendChild(defaultOption);
        }
    }
};

/**
 * Configura los event listeners para los filtros
 */
export const setupFilterEventListeners = () => {
    // Event listeners para recargar tareas cuando cambien los filtros
    const filterElements = [
        'filter-state',
        'filter-assigned-to',
        'filter-text',
        'filter-department'
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
        resetBtn.addEventListener('click', async () => {
            // Resetear todos los filtros a valores por defecto
            document.getElementById('filter-text').value = '';
            document.getElementById('filter-state').value = 'OPEN_TASKS';
            
            const departmentFilter = document.getElementById('filter-department');
            if (departmentFilter) {
                departmentFilter.value = '';
            }
            
            // Establecer el usuario actual como filtro por defecto
            try {
                const currentProfile = await getCurrentUserProfile();
                const assignedFilter = document.getElementById('filter-assigned-to');
                if (assignedFilter && currentProfile) {
                    assignedFilter.value = currentProfile.id;
                }
            } catch (error) {
                console.error('Error obteniendo perfil actual:', error);
                document.getElementById('filter-assigned-to').value = '';
            }
            
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
        
        // Precarga de filtros después de cargar usuarios
        await preloadFilters();
        
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
    
    // Cargar departamentos y usuarios
    await loadTaskDetailDepartments(task.departamento);
    await loadTaskDetailAssignedUsers(task.asignado_a, task.departamento);
    
    // Configurar lógica de privacidad
    await updateTaskDetailPrivateLogic(task);
    
    // Configurar event listeners para cambios dinámicos
    setupTaskDetailEventListeners(task);
};

/**
 * Carga los departamentos disponibles en el modal de edición
 * @param {string} currentDepartmentId - ID del departamento actual
 */
const loadTaskDetailDepartments = async (currentDepartmentId) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        const departments = await getDepartments();
        
        const departmentSelect = document.getElementById('task-detail-department');
        departmentSelect.innerHTML = '';
        
        // Agregar opción "Sin departamento"
        const noDeptOption = document.createElement('option');
        noDeptOption.value = '';
        noDeptOption.textContent = 'Sin departamento';
        if (!currentDepartmentId) {
            noDeptOption.selected = true;
        }
        departmentSelect.appendChild(noDeptOption);
        
        // Lógica según el rol del usuario
        if (currentProfile.role === 'Administrador') {
            // Administradores pueden elegir cualquier departamento
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.nombre;
                if (dept.id === currentDepartmentId) {
                    option.selected = true;
                }
                departmentSelect.appendChild(option);
            });
        } else if (['Coordinador', 'Responsable'].includes(currentProfile.role)) {
            // Coordinadores y Responsables pueden elegir su departamento y otros
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.nombre;
                if (dept.id === currentDepartmentId) {
                    option.selected = true;
                }
                departmentSelect.appendChild(option);
            });
        } else if (currentProfile.role === 'Usuario' && currentProfile.departamento_id) {
            // Usuarios estándar solo pueden elegir su departamento (bloqueado)
            const userDept = departments.find(d => d.id === currentProfile.departamento_id);
            if (userDept) {
                const option = document.createElement('option');
                option.value = userDept.id;
                option.textContent = userDept.nombre;
                option.selected = true;
                departmentSelect.appendChild(option);
                departmentSelect.disabled = true;
                departmentSelect.classList.add('opacity-50', 'cursor-not-allowed');
            }
        } else {
            // Usuarios sin departamento - solo "Sin departamento" (bloqueado)
            departmentSelect.disabled = true;
            departmentSelect.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
    } catch (error) {
        console.error('Error cargando departamentos para edición:', error);
    }
};

/**
 * Carga el dropdown de usuarios para asignación en el modal
 * @param {string} currentAssignedId - ID del usuario actualmente asignado
 * @param {string} selectedDepartmentId - ID del departamento seleccionado
 */
const loadTaskDetailAssignedUsers = async (currentAssignedId, selectedDepartmentId) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        const supervisedUsers = await getSupervisedUsers();
        
        const assignedSelect = document.getElementById('task-detail-assigned');
        assignedSelect.innerHTML = '';
        
        // Agregar opción "Sin usuario asignado"
        const noUserOption = document.createElement('option');
        noUserOption.value = '';
        noUserOption.textContent = 'Sin usuario asignado';
        if (!currentAssignedId) {
            noUserOption.selected = true;
        }
        assignedSelect.appendChild(noUserOption);
        
        if (currentProfile.role === 'Usuario' && !currentProfile.departamento_id) {
            // Usuarios sin departamento - solo pueden asignarse a sí mismos (bloqueado)
            const currentOption = document.createElement('option');
            currentOption.value = currentProfile.id;
            currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
            currentOption.selected = true;
            assignedSelect.appendChild(currentOption);
            assignedSelect.disabled = true;
            assignedSelect.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (currentProfile.role === 'Usuario' && currentProfile.departamento_id) {
            // Usuarios estándar - solo pueden asignarse a sí mismos (bloqueado)
            const currentOption = document.createElement('option');
            currentOption.value = currentProfile.id;
            currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
            currentOption.selected = true;
            assignedSelect.appendChild(currentOption);
            assignedSelect.disabled = true;
            assignedSelect.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (['Coordinador', 'Responsable'].includes(currentProfile.role)) {
            if (selectedDepartmentId === currentProfile.departamento_id) {
                // En su propio departamento - pueden elegir usuarios del departamento
                assignedSelect.disabled = false;
                assignedSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                
                // Agregar usuario actual
                const currentOption = document.createElement('option');
                currentOption.value = currentProfile.id;
                currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
                if (currentAssignedId === currentProfile.id) {
                    currentOption.selected = true;
                }
                assignedSelect.appendChild(currentOption);

                // Agregar usuarios del departamento
                supervisedUsers.forEach(user => {
                    if (user.departamento_id === selectedDepartmentId) {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.full_name || user.username;
                        if (currentAssignedId === user.id) {
                            option.selected = true;
                        }
                        assignedSelect.appendChild(option);
                    }
                });
            } else if (selectedDepartmentId && selectedDepartmentId !== currentProfile.departamento_id) {
                // Departamento diferente - sin usuarios disponibles, queda "Sin usuario asignado"
                assignedSelect.disabled = true;
                assignedSelect.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                // Sin departamento seleccionado - pueden elegir cualquier usuario supervisado
                assignedSelect.disabled = false;
                assignedSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                
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
            }
        } else if (currentProfile.role === 'Administrador') {
            // Administradores pueden elegir cualquier usuario
            assignedSelect.disabled = false;
            assignedSelect.classList.remove('opacity-50', 'cursor-not-allowed');
            
            // Agregar usuario actual
            const currentOption = document.createElement('option');
            currentOption.value = currentProfile.id;
            currentOption.textContent = `${currentProfile.full_name || currentProfile.username} (Yo)`;
            if (currentAssignedId === currentProfile.id) {
                currentOption.selected = true;
            }
            assignedSelect.appendChild(currentOption);
            
            if (selectedDepartmentId) {
                // Cargar usuarios del departamento seleccionado
                supervisedUsers.forEach(user => {
                    if (user.departamento_id === selectedDepartmentId) {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.full_name || user.username;
                        if (currentAssignedId === user.id) {
                            option.selected = true;
                        }
                        assignedSelect.appendChild(option);
                    }
                });
            } else {
                // Sin departamento - mostrar todos los usuarios supervisados
                supervisedUsers.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.full_name || user.username;
                    if (currentAssignedId === user.id) {
                        option.selected = true;
                    }
                    assignedSelect.appendChild(option);
                });
            }
        }
        
    } catch (error) {
        console.error('Error cargando usuarios para asignación:', error);
    }
};

/**
 * Actualiza la lógica del checkbox de tarea privada en el modal de edición
 * @param {object} task - Datos de la tarea
 */
const updateTaskDetailPrivateLogic = async (task) => {
    try {
        const privateCheckbox = document.getElementById('task-detail-private');
        const departmentSelect = document.getElementById('task-detail-department');
        const assignedSelect = document.getElementById('task-detail-assigned');
        if (!privateCheckbox || !departmentSelect || !assignedSelect) return;

        const currentProfile = await getCurrentUserProfile();
        const selectedDepartmentId = departmentSelect.value;
        const selectedUserId = assignedSelect.value;

        // Reset checkbox state
        privateCheckbox.disabled = false;
        privateCheckbox.parentElement.classList.remove('opacity-50');

        // Una tarea solo se puede marcar como privada si:
        // 1. La tarea está asignada al mismo usuario que la creó
        // 2. Y es el usuario activo (quien está editando)
        const canBePrivate = (
            task.creado_por === currentProfile.id && // El usuario actual es el creador
            selectedUserId === currentProfile.id && // La tarea está asignada al usuario actual
            task.creado_por === selectedUserId // El creador es el mismo que el asignado
        );

        if (!canBePrivate) {
            privateCheckbox.checked = false;
            privateCheckbox.disabled = true;
            privateCheckbox.parentElement.classList.add('opacity-50');
        }

    } catch (error) {
        console.error('Error actualizando lógica de checkbox privado:', error);
    }
};

/**
 * Configura los event listeners para el modal de edición de tareas
 * @param {object} task - Datos de la tarea
 */
const setupTaskDetailEventListeners = (task) => {
    const departmentSelect = document.getElementById('task-detail-department');
    const assignedSelect = document.getElementById('task-detail-assigned');
    
    if (departmentSelect) {
        departmentSelect.addEventListener('change', async () => {
            const selectedDepartmentId = departmentSelect.value;
            await loadTaskDetailAssignedUsers(assignedSelect.value, selectedDepartmentId);
            await updateTaskDetailPrivateLogic(task);
        });
    }
    
    if (assignedSelect) {
        assignedSelect.addEventListener('change', async () => {
            await updateTaskDetailPrivateLogic(task);
        });
    }
    
    // Event listener para guardar cambios
    const saveBtn = document.getElementById('btn-save-task-changes');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => saveTaskChanges(task));
    }
};

/**
 * Guarda los cambios realizados en la tarea
 * @param {object} originalTask - Datos originales de la tarea
 */
const saveTaskChanges = async (originalTask) => {
    try {
        const saveBtn = document.getElementById('btn-save-task-changes');
        if (!saveBtn) return;

        // Deshabilitar botón durante el proceso
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Guardando...';
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');

        // Obtener datos del formulario
        const newData = {
            titulo: document.getElementById('task-detail-title').value,
            descripcion: document.getElementById('task-detail-description').value,
            estado: document.getElementById('task-detail-status').value,
            prioridad: document.getElementById('task-detail-priority').value,
            departamento: document.getElementById('task-detail-department').value === '' ? null : document.getElementById('task-detail-department').value,
            asignado_a: document.getElementById('task-detail-assigned').value === '' ? null : document.getElementById('task-detail-assigned').value,
            privada: document.getElementById('task-detail-private').checked
        };

        // Detectar cambios y crear entradas de historial
        const changes = [];
        
        if (originalTask.titulo !== newData.titulo) {
            changes.push({
                campo: 'titulo',
                valor_anterior: originalTask.titulo,
                valor_nuevo: newData.titulo,
                comentario: `Título cambiado de "${originalTask.titulo}" a "${newData.titulo}"`
            });
        }
        
        if (originalTask.descripcion !== newData.descripcion) {
            changes.push({
                campo: 'descripcion',
                valor_anterior: originalTask.descripcion || '',
                valor_nuevo: newData.descripcion || '',
                comentario: `Descripción actualizada`
            });
        }
        
        if (originalTask.estado !== newData.estado) {
            changes.push({
                campo: 'estado',
                valor_anterior: originalTask.estado,
                valor_nuevo: newData.estado,
                comentario: `Estado cambiado de "${originalTask.estado}" a "${newData.estado}"`
            });
        }
        
        if (originalTask.prioridad !== newData.prioridad) {
            changes.push({
                campo: 'prioridad',
                valor_anterior: originalTask.prioridad,
                valor_nuevo: newData.prioridad,
                comentario: `Prioridad cambiada de "${originalTask.prioridad}" a "${newData.prioridad}"`
            });
        }
        
        if (originalTask.departamento !== newData.departamento) {
            // Obtener nombres de departamentos para el comentario
            const departments = await getDepartments();
            const oldDeptName = originalTask.departamento ? 
                departments.find(d => d.id === originalTask.departamento)?.nombre || 'Departamento desconocido' : 
                'Sin departamento';
            const newDeptName = newData.departamento ? 
                departments.find(d => d.id === newData.departamento)?.nombre || 'Departamento desconocido' : 
                'Sin departamento';
                
            changes.push({
                campo: 'departamento',
                valor_anterior: originalTask.departamento || '',
                valor_nuevo: newData.departamento || '',
                comentario: `Departamento cambiado de "${oldDeptName}" a "${newDeptName}"`
            });
        }
        
        if (originalTask.asignado_a !== newData.asignado_a) {
            // Obtener nombres de usuarios para el comentario
            const users = await getSupervisedUsers();
            const currentProfile = await getCurrentUserProfile();
            const allUsers = [currentProfile, ...users];
            
            const oldUserName = originalTask.asignado_a ? 
                allUsers.find(u => u.id === originalTask.asignado_a)?.full_name || 
                allUsers.find(u => u.id === originalTask.asignado_a)?.username || 'Usuario desconocido' : 
                'Sin asignar';
            const newUserName = newData.asignado_a ? 
                allUsers.find(u => u.id === newData.asignado_a)?.full_name || 
                allUsers.find(u => u.id === newData.asignado_a)?.username || 'Usuario desconocido' : 
                'Sin asignar';
                
            changes.push({
                campo: 'asignado_a',
                valor_anterior: originalTask.asignado_a || '',
                valor_nuevo: newData.asignado_a || '',
                comentario: `Asignación cambiada de "${oldUserName}" a "${newUserName}"`
            });
        }
        
        if (originalTask.privada !== newData.privada) {
            changes.push({
                campo: 'privada',
                valor_anterior: originalTask.privada ? 'Sí' : 'No',
                valor_nuevo: newData.privada ? 'Sí' : 'No',
                comentario: `Privacidad cambiada a "${newData.privada ? 'Privada' : 'Pública'}"`
            });
        }

        if (changes.length === 0) {
            showToast('No hay cambios para guardar', 'info');
            return;
        }

        // Llamar a la función de Supabase para actualizar la tarea
        const result = await updateTaskWithHistory(originalTask.id, newData, changes);

        if (result.success) {
            showToast('Tarea actualizada correctamente', 'success');
            
            // Actualizar los datos originales para futuras comparaciones
            Object.assign(originalTask, newData);
            
            // Recargar la lista de tareas
            await loadTasks();
        } else {
            throw new Error(result.error || 'Error desconocido al actualizar la tarea');
        }

    } catch (error) {
        console.error('Error guardando cambios de tarea:', error);
        showToast(error.message || 'Error al guardar los cambios', 'error');
    } finally {
        // Rehabilitar botón
        const saveBtn = document.getElementById('btn-save-task-changes');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Guardar Cambios';
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
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
        // Mensaje de sistema alineado a la izquierda
        messageDiv.className = 'flex justify-start';
        
        const systemBubble = document.createElement('div');
        systemBubble.className = 'max-w-xs lg:max-w-md px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border-l-4 border-blue-500';
        
        const systemIcon = document.createElement('div');
        systemIcon.className = 'text-xs font-medium mb-1 text-blue-400 flex items-center';
        systemIcon.innerHTML = '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>Sistema';
        
        const messageText = document.createElement('div');
        messageText.className = 'text-sm';
        
        if (entry.comentario) {
            messageText.textContent = entry.comentario;
        } else {
            const userName = entry.usuario_profile?.full_name || entry.usuario_profile?.username || 'Usuario';
            messageText.textContent = `${userName} modificó ${entry.campo_modificado}: ${entry.valor_nuevo}`;
        }
        
        const timeText = document.createElement('div');
        timeText.className = 'text-xs opacity-75 mt-1 text-slate-400';
        timeText.textContent = formatTime(entry.created_at);
        
        systemBubble.appendChild(systemIcon);
        systemBubble.appendChild(messageText);
        systemBubble.appendChild(timeText);
        messageDiv.appendChild(systemBubble);
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
    const assignedFilter = document.getElementById('filter-assigned-to')?.value || '';
    const departmentFilter = document.getElementById('filter-department')?.value || '';
    
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
        
        // Filtro de asignación
        const matchesAssigned = !assignedFilter || task.asignado_a === assignedFilter;
        
        // Filtro de departamento - usar el campo departamento de la tarea
        const matchesDepartment = !departmentFilter || task.departamento === departmentFilter;
        
        return matchesText && matchesState && matchesAssigned && matchesDepartment;
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
