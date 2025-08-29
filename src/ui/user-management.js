// src/ui/user-management.js

import { showToast } from './tasks.js'; // Asegúrate de que esta importación exista
import { initializeUserSession } from './menu.js'
import { createUser, getAllUsers, updateUser, deleteUser, getDepartments } from '../api/supabase.js';


let currentUsers = [];
let currentDepartments = [];

// Función para mostrar la pantalla de gestión de usuarios
export async function showUserManagementScreen() {
    const mainScreen = document.getElementById('screen-main');
    const userManagementScreen = document.getElementById('screen-user-management');
    
    if (mainScreen && userManagementScreen) {
        mainScreen.classList.add('hidden');
        userManagementScreen.classList.remove('hidden');
        
        // Inicializar la interfaz de usuario para esta pantalla, incluyendo el menú.
        await initializeUserSession('screen-user-management'); // <--- AÑADE ESTA LÍNEA
        
        // Cargar datos iniciales
        loadUserManagementData();
    }
}

// Función para volver a la pantalla principal
export function showMainScreen() {
    const mainScreen = document.getElementById('screen-main');
    const userManagementScreen = document.getElementById('screen-user-management');
    
    if (mainScreen && userManagementScreen) {
        userManagementScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
    }
}

// Función para cargar todos los datos necesarios
async function loadUserManagementData() {
    try {
        console.log('Iniciando carga de datos de gestión de usuarios...');
        await Promise.all([
            loadUsers(),
            loadDepartments()
        ]);
        console.log('Datos cargados, renderizando tabla...');
        renderUsersTable();
    } catch (error) {
        console.error('Error cargando datos de gestión de usuarios:', error);
        console.error('Detalles del error:', error.message);
        showToast(`Error cargando datos de usuarios: ${error.message}`, 'error');
    }
}

// Función para cargar usuarios
async function loadUsers() {
    try {
        console.log('Llamando a getAllUsers()...');
        currentUsers = await getAllUsers();
        console.log('Usuarios cargados:', currentUsers);
        console.log('Número de usuarios:', currentUsers.length);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        throw error;
    }
}

// Función para cargar departamentos
async function loadDepartments() {
    try {
        currentDepartments = await getDepartments();
        console.log('Departamentos cargados:', currentDepartments);
        
        // Actualizar selects de departamentos
        updateDepartmentSelects();
    } catch (error) {
        console.error('Error cargando departamentos:', error);
        throw error;
    }
}

// Función para actualizar todos los selects de departamentos
function updateDepartmentSelects() {
    const selects = [
        'user-management-department-add',
        'edit-user-department',
        'filter-user-department'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Guardar valor actual
            const currentValue = select.value;
            
            // Limpiar opciones excepto la primera
            const firstOption = select.firstElementChild;
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            // Agregar departamentos
            currentDepartments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.nombre;
                select.appendChild(option);
            });
            
            // Restaurar valor si existe
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

// Función para renderizar la tabla de usuarios
function renderUsersTable() {
    console.log('Renderizando tabla de usuarios...');
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('No se encontró el elemento users-table-body');
        return;
    }
    
    console.log('currentUsers antes de filtrar:', currentUsers);
    
    // Aplicar filtros
    const filteredUsers = applyUserFilters();
    console.log('Usuarios filtrados:', filteredUsers);
    
    tbody.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 px-4 text-center text-slate-400">
                    ${currentUsers.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios con los filtros aplicados'}
                </td>
            </tr>
        `;
        return;
    }
    
    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-600 transition-colors';
        
        const departmentName = user.departamento_id ? 
            (currentDepartments.find(d => d.id === user.departamento_id)?.nombre || 'Desconocido') : 
            'Sin departamento';
        
        row.innerHTML = `
            <td class="py-3 px-4 text-slate-200">${user.username}</td>
            <td class="py-3 px-4 text-slate-200">${user.full_name || '-'}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}">
                    ${user.role}
                </span>
            </td>
            <td class="py-3 px-4 text-slate-200">${departmentName}</td>
            <td class="py-3 px-4">
                <div class="flex gap-2">
                    <button onclick="editUser('${user.id}')" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">
                        Editar
                    </button>
                    <button onclick="deleteUserConfirm('${user.id}')" 
                            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors">
                        Eliminar
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('Tabla renderizada con', filteredUsers.length, 'usuarios');
}

// Función para obtener la clase CSS del badge según el rol
function getRoleBadgeClass(role) {
    switch (role) {
        case 'Administrador':
            return 'bg-red-600 text-white';
        case 'Responsable':
            return 'bg-purple-600 text-white';
        case 'Coordinador':
            return 'bg-blue-600 text-white';
        case 'Usuario':
        default:
            return 'bg-gray-600 text-white';
    }
}

// Función para aplicar filtros a los usuarios
function applyUserFilters() {
    const nameFilter = document.getElementById('filter-user-name')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('filter-user-role')?.value || '';
    const departmentFilter = document.getElementById('filter-user-department')?.value || '';
    
    return currentUsers.filter(user => {
        const matchesName = !nameFilter || 
            user.username.toLowerCase().includes(nameFilter) ||
            (user.full_name && user.full_name.toLowerCase().includes(nameFilter));
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        
        const matchesDepartment = !departmentFilter || user.departamento_id === departmentFilter;
        
        return matchesName && matchesRole && matchesDepartment;
    });
}

// Función para limpiar filtros
function clearUserFilters() {
    document.getElementById('filter-user-name').value = '';
    document.getElementById('filter-user-role').value = '';
    document.getElementById('filter-user-department').value = '';
    renderUsersTable();
}

// Función removida - ahora se usa el modal de nuevo usuario desde login

// Función para editar usuario
window.editUser = async function(userId) {
    const user = currentUsers.find(u => u.id === userId);
    if (!user) return;
    
    // Llenar el modal de edición
    document.getElementById('edit-user-username').value = user.username;
    document.getElementById('edit-user-role').value = user.role;
    document.getElementById('edit-user-full-name').value = user.full_name || '';
    document.getElementById('edit-user-department').value = user.departamento_id || '';
    document.getElementById('edit-user-password').value = '';
    
    // Mostrar fechas
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleString('es-ES') : '-';
    const lastActivity = user.last_activity ? new Date(user.last_activity).toLocaleString('es-ES') : '-';
    
    document.getElementById('edit-user-created-at').textContent = createdAt;
    document.getElementById('edit-user-last-activity').textContent = lastActivity;
    
    // Guardar ID del usuario que se está editando
    document.getElementById('edit-user-modal').dataset.userId = userId;
    
    // Mostrar modal
    document.getElementById('edit-user-modal').classList.remove('hidden');
    document.getElementById('edit-user-modal').classList.add('flex');
};

// Función para guardar cambios del usuario editado
async function saveEditedUser() {
    const modal = document.getElementById('edit-user-modal');
    const userId = modal.dataset.userId;
    
    if (!userId) return;
    
    const role = document.getElementById('edit-user-role').value;
    const fullName = document.getElementById('edit-user-full-name').value.trim();
    const departmentId = document.getElementById('edit-user-department').value || null;
    const password = document.getElementById('edit-user-password').value;
    
    if (!fullName) {
        showToast('El nombre completo es obligatorio', 'error');
        return;
    }
    
    try {
        const updateData = {
            role: role,
            full_name: fullName,
            departamento_id: departmentId
        };
        
        // Solo incluir contraseña si se proporcionó
        if (password && password.length >= 6) {
            updateData.password = password;
        } else if (password && password.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        const result = await updateUser(userId, updateData);
        
        if (result && result.success) {
            showToast('Usuario actualizado correctamente', 'success');
            
            // Cerrar modal
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            
            // Recargar usuarios
            await loadUsers();
            renderUsersTable();
        } else {
            throw new Error(result.error || 'Error desconocido al actualizar el usuario');
        }
        
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        showToast(error.message || 'Error al actualizar el usuario', 'error');
    }
}

// Función para confirmar eliminación de usuario
window.deleteUserConfirm = function(userId) {
    const user = currentUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('delete-confirm-modal');
    const title = document.getElementById('delete-confirm-modal-title');
    const message = document.getElementById('delete-confirm-modal-message');
    
    title.textContent = 'Confirmar Eliminación de Usuario';
    message.textContent = `¿Estás seguro de que quieres eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`;
    
    // Guardar ID del usuario a eliminar
    modal.dataset.userId = userId;
    
    // Mostrar modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// Función para eliminar usuario
async function deleteUserFinal() {
    const modal = document.getElementById('delete-confirm-modal');
    const userId = modal.dataset.userId;
    
    if (!userId) return;
    
    try {
        const result = await deleteUser(userId);
        
        if (result && result.success) {
            showToast('Usuario eliminado correctamente', 'success');
            
            // Cerrar modal
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            
            // Recargar usuarios
            await loadUsers();
            renderUsersTable();
        } else {
            throw new Error(result.error || 'Error desconocido al eliminar el usuario');
        }
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showToast(error.message || 'Error al eliminar el usuario', 'error');
    }
}

// Función para mostrar toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 transition-opacity duration-300 ${
        type === 'success' ? 'bg-emerald-600 text-white' :
        type === 'error' ? 'bg-red-600 text-white' :
        'bg-slate-700 text-slate-200'
    }`;
    
    toast.classList.remove('hidden');
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Función para inicializar la gestión de usuarios
export function initializeUserManagement() {
    // Event listeners para navegación
    const userManagementBtn = document.getElementById('btn-user-management');
    const backToMainBtn = document.getElementById('btn-back-to-main-from-user-list');
    const backArrowBtn = document.getElementById('btn-back-user-management');
    
    if (userManagementBtn) {
        userManagementBtn.addEventListener('click', showUserManagementScreen);
    }
    
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', showMainScreen);
    }
    
    if (backArrowBtn) {
        backArrowBtn.addEventListener('click', showMainScreen);
    }
    
    // Event listener para botón de crear nuevo usuario (modal)
    const showNewUserModalBtn = document.getElementById('btn-show-new-user-modal-admin');
    if (showNewUserModalBtn) {
        showNewUserModalBtn.addEventListener('click', () => {
            // Mostrar el modal de nuevo usuario (mismo que desde login)
            document.getElementById('new-user-modal').classList.remove('hidden');
            document.getElementById('new-user-modal').classList.add('flex');
        });
    }
    
    // Event listeners para filtros
    const filterInputs = [
        'filter-user-name',
        'filter-user-role', 
        'filter-user-department'
    ];
    
    filterInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', renderUsersTable);
        }
    });
    
    // Event listener para limpiar filtros
    const clearFiltersBtn = document.getElementById('btn-clear-user-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearUserFilters);
    }
    
    // Event listeners para modal de edición
    const saveEditedUserBtn = document.getElementById('btn-save-edited-user');
    const cancelEditUserBtn = document.getElementById('btn-cancel-edit-user');
    
    if (saveEditedUserBtn) {
        saveEditedUserBtn.addEventListener('click', saveEditedUser);
    }
    
    if (cancelEditUserBtn) {
        cancelEditUserBtn.addEventListener('click', () => {
            const modal = document.getElementById('edit-user-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
    }
    
    // Event listeners para modal de confirmación de eliminación
    const deleteConfirmBtn = document.getElementById('btn-delete-confirm');
    const deleteCancelBtn = document.getElementById('btn-delete-cancel');
    
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', deleteUserFinal);
    }
    
    if (deleteCancelBtn) {
        deleteCancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('delete-confirm-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
    }
}
