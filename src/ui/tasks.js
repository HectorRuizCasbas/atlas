// src/ui/tasks.js
// Funciones para la gestión de tareas

import { createTask, getCurrentUserProfile, getSupervisedUsers } from '../api/supabase.js';

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
};
