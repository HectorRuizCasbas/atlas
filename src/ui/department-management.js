// src/ui/department-management.js

import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getVisibleUsers, getCurrentUserProfile, updateUserRole } from '../api/supabase.js';
import { showToast } from './tasks.js';

let currentDepartments = [];
let currentUsers = [];

// Función para mostrar la pantalla de gestión de departamentos
export function showDepartmentManagementScreen() {
    const mainScreen = document.getElementById('screen-main');
    const departmentManagementScreen = document.getElementById('screen-department-management');
    
    if (mainScreen && departmentManagementScreen) {
        mainScreen.classList.add('hidden');
        departmentManagementScreen.classList.remove('hidden');
        
        // Cargar datos iniciales
        loadDepartmentManagementData();
    }
}

// Función para volver a la pantalla principal
export function showMainScreen() {
    const mainScreen = document.getElementById('screen-main');
    const departmentManagementScreen = document.getElementById('screen-department-management');
    
    if (mainScreen && departmentManagementScreen) {
        departmentManagementScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
    }
}

// Función para cargar todos los datos necesarios
async function loadDepartmentManagementData() {
    try {
        console.log('Iniciando carga de datos de gestión de departamentos...');
        // Cargar usuarios primero para poder filtrar departamentos
        await loadUsers();
        await loadDepartments();
        console.log('Datos cargados, renderizando tabla...');
        renderDepartmentsTable();
    } catch (error) {
        console.error('Error cargando datos de gestión de departamentos:', error);
        showToast(`Error cargando datos de departamentos: ${error.message}`, 'error');
    }
}

// Función para cargar departamentos
async function loadDepartments() {
    try {
        console.log('Llamando a getDepartments()...');
        const allDepartments = await getDepartments();
        const currentProfile = await getCurrentUserProfile();
        
        // Si es Responsable, solo mostrar departamentos donde es responsable
        if (currentProfile.role === 'Responsable') {
            currentDepartments = allDepartments.filter(dept => {
                // Verificar si el usuario actual es responsable de este departamento
                const departmentUsers = currentUsers.filter(user => user.departamento_id === dept.id);
                return departmentUsers.some(user => user.id === currentProfile.id && user.role === 'Responsable');
            });
        } else {
            // Administradores ven todos los departamentos
            currentDepartments = allDepartments;
        }
        
        console.log('Departamentos filtrados:', currentDepartments);
    } catch (error) {
        console.error('Error cargando departamentos:', error);
        throw error;
    }
}

// Función para cargar usuarios
async function loadUsers() {
    try {
        console.log('Llamando a getVisibleUsers()...');
        currentUsers = await getVisibleUsers();
        console.log('Usuarios cargados:', currentUsers);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        throw error;
    }
}

// Función para renderizar la tabla de departamentos
function renderDepartmentsTable() {
    const tableBody = document.getElementById('departments-table-body');
    if (!tableBody) {
        console.error('No se encontró el elemento departments-table-body');
        return;
    }

    // Limpiar tabla
    tableBody.innerHTML = '';

    if (!currentDepartments || currentDepartments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-400">
                    No hay departamentos disponibles
                </td>
            </tr>
        `;
        return;
    }

    // Renderizar cada departamento
    currentDepartments.forEach(department => {
        const row = createDepartmentRow(department);
        tableBody.appendChild(row);
    });
}

// Función para crear una fila de departamento
function createDepartmentRow(department) {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-700 hover:bg-gray-700';

    // Contar usuarios por rol en este departamento
    const departmentUsers = currentUsers.filter(user => user.departamento_id === department.id);
    const adminCount = departmentUsers.filter(user => user.role === 'Administrador').length;
    const responsableCount = departmentUsers.filter(user => user.role === 'Responsable').length;
    const coordinadorCount = departmentUsers.filter(user => user.role === 'Coordinador').length;
    const usuarioCount = departmentUsers.filter(user => user.role === 'Usuario').length;

    row.innerHTML = `
        <td class="px-6 py-4 font-medium text-white">
            ${department.nombre}
        </td>
        <td class="px-6 py-4 text-gray-300">
            ${department.descripcion || 'Sin descripción'}
        </td>
        <td class="px-6 py-4 text-gray-300">
            <div class="text-sm">
                <div>Admin: ${adminCount}</div>
                <div>Resp: ${responsableCount}</div>
                <div>Coord: ${coordinadorCount}</div>
                <div>Usuario: ${usuarioCount}</div>
            </div>
        </td>
        <td class="px-6 py-4">
            <div class="flex space-x-2">
                <button 
                    onclick="editDepartment('${department.id}')"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                    Editar
                </button>
                <button 
                    onclick="deleteDepartment('${department.id}')"
                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    ${departmentUsers.length > 0 ? 'disabled title="No se puede eliminar un departamento con usuarios"' : ''}
                >
                    Eliminar
                </button>
            </div>
        </td>
    `;

    return row;
}

// Función para mostrar el modal de editar departamento
async function showEditDepartmentModal(departmentId) {
    const department = currentDepartments.find(d => d.id === departmentId);
    if (!department) return;

    document.getElementById('edit-department-id').value = department.id;
    document.getElementById('edit-department-name').value = department.nombre;
    document.getElementById('edit-department-description').value = department.descripcion || '';

    // Cargar usuarios del departamento
    await loadDepartmentUsers(departmentId);

    const modal = document.getElementById('edit-department-modal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

// Función para cargar usuarios del departamento en el modal de edición
async function loadDepartmentUsers(departmentId) {
    const departmentUsers = currentUsers.filter(user => user.departamento_id === departmentId);
    const currentProfile = await getCurrentUserProfile();
    const container = document.getElementById('department-users-list');
    
    if (departmentUsers.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No hay usuarios asignados a este departamento</p>';
        return;
    }

    container.innerHTML = departmentUsers.map(user => {
        const canEditRole = canCurrentUserEditRole(currentProfile.role, user.role);
        
        return `
            <div class="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                        <span class="text-white font-semibold">${user.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <h5 class="font-medium">${user.full_name}</h5>
                        <p class="text-sm text-gray-400">${user.email}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <select 
                        class="bg-slate-600 border border-slate-500 rounded-md px-3 py-1 text-sm ${canEditRole ? '' : 'opacity-50 cursor-not-allowed'}"
                        data-user-id="${user.id}"
                        ${canEditRole ? '' : 'disabled'}
                        onchange="handleRoleChange('${user.id}', this.value)"
                    >
                        <option value="Usuario" ${user.role === 'Usuario' ? 'selected' : ''}>Usuario</option>
                        <option value="Coordinador" ${user.role === 'Coordinador' ? 'selected' : ''}>Coordinador</option>
                        ${currentProfile.role === 'Administrador' ? `<option value="Responsable" ${user.role === 'Responsable' ? 'selected' : ''}>Responsable</option>` : ''}
                        ${currentProfile.role === 'Administrador' ? `<option value="Administrador" ${user.role === 'Administrador' ? 'selected' : ''}>Administrador</option>` : ''}
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

// Función para determinar si el usuario actual puede editar un rol específico
function canCurrentUserEditRole(currentRole, targetRole) {
    if (currentRole === 'Administrador') {
        return true; // Administradores pueden editar cualquier rol
    }
    
    if (currentRole === 'Responsable') {
        // Responsables pueden editar Usuario y Coordinador, pero no otros Responsables o Administradores
        return targetRole === 'Usuario' || targetRole === 'Coordinador';
    }
    
    return false; // Otros roles no pueden editar
}

// Función para obtener la clase de color del rol
function getRoleColorClass(role) {
    switch (role) {
        case 'Administrador': return 'bg-red-600 text-white';
        case 'Responsable': return 'bg-blue-600 text-white';
        case 'Coordinador': return 'bg-yellow-600 text-white';
        case 'Usuario': return 'bg-green-600 text-white';
        default: return 'bg-gray-600 text-white';
    }
}

// Función para manejar cambios de rol (se llamará desde el HTML)
window.handleRoleChange = async function(userId, newRole) {
    try {
        const result = await updateUserRole(userId, newRole);
        if (result.success) {
            showToast(`Rol actualizado correctamente`, 'success');
            // Recargar usuarios para reflejar cambios
            await loadUsers();
            // Recargar la lista de usuarios del departamento en el modal
            const departmentId = document.getElementById('edit-department-id').value;
            await loadDepartmentUsers(departmentId);
        } else {
            showToast(result.error || 'Error actualizando rol', 'error');
        }
    } catch (error) {
        console.error('Error actualizando rol:', error);
        showToast('Error actualizando rol', 'error');
    }
};

// Función para editar departamento
window.editDepartment = async function(departmentId) {
    await showEditDepartmentModal(departmentId);
};

// Función para eliminar departamento
window.deleteDepartment = async function(departmentId) {
    const department = currentDepartments.find(d => d.id === departmentId);
    if (!department) {
        showToast('Departamento no encontrado', 'error');
        return;
    }

    // Verificar si tiene usuarios y mostrar modal personalizado
    const departmentUsers = currentUsers.filter(user => user.departamento_id === departmentId);
    showDeleteDepartmentModal(department, departmentUsers);
};

// Función para mostrar modal de confirmación de eliminación
function showDeleteDepartmentModal(department, departmentUsers) {
    const hasUsers = departmentUsers.length > 0;
    let modalContent = '';
    
    if (hasUsers) {
        const usersByRole = departmentUsers.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});
        
        const rolesList = Object.entries(usersByRole)
            .map(([role, count]) => `${count} ${role}${count > 1 ? 's' : ''}`)
            .join(', ');
            
        modalContent = `
            <div class="bg-slate-800 p-8 rounded-xl shadow-lg max-w-md w-full">
                <div class="text-center mb-6">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c.77.833 1.732 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-red-300 mb-2">No se puede eliminar departamento</h3>
                    <p class="text-sm text-gray-300 mb-4">
                        El departamento <strong>"${department.nombre}"</strong> tiene <strong>${departmentUsers.length} usuario${departmentUsers.length > 1 ? 's' : ''}</strong> asignado${departmentUsers.length > 1 ? 's' : ''}:
                    </p>
                    <div class="bg-slate-700 p-3 rounded-lg mb-4">
                        <p class="text-sm text-emerald-300">${rolesList}</p>
                    </div>
                    <p class="text-xs text-gray-400">
                        Para eliminar este departamento, primero debe reasignar o eliminar todos los usuarios.
                    </p>
                </div>
                <div class="flex justify-center">
                    <button onclick="closeDeleteModal()" 
                            class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200">
                        Entendido
                    </button>
                </div>
            </div>
        `;
    } else {
        modalContent = `
            <div class="bg-slate-800 p-8 rounded-xl shadow-lg max-w-md w-full">
                <div class="text-center mb-6">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                        <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c.77.833 1.732 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-yellow-300 mb-2">Confirmar eliminación</h3>
                    <p class="text-sm text-gray-300 mb-4">
                        ¿Estás seguro de que deseas eliminar el departamento <strong>"${department.nombre}"</strong>?
                    </p>
                    <p class="text-xs text-gray-400 mb-4">
                        Esta acción no se puede deshacer.
                    </p>
                </div>
                <div class="flex justify-center gap-4">
                    <button onclick="closeDeleteModal()" 
                            class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
                        Cancelar
                    </button>
                    <button onclick="confirmDeleteDepartment('${department.id}')" 
                            class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }
    
    // Crear y mostrar modal
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'delete-department-modal';
    modalOverlay.className = 'fixed inset-0 flex items-center justify-center modal-bg z-[1100]';
    modalOverlay.innerHTML = modalContent;
    
    document.body.appendChild(modalOverlay);
}

// Función para cerrar modal de eliminación
window.closeDeleteModal = function() {
    const modal = document.getElementById('delete-department-modal');
    if (modal) {
        modal.remove();
    }
};

// Función para confirmar eliminación de departamento
window.confirmDeleteDepartment = async function(departmentId) {
    try {
        const result = await deleteDepartment(departmentId);
        
        if (result.success) {
            showToast('Departamento eliminado exitosamente', 'success');
            closeDeleteModal();
            // Recargar datos
            await loadDepartmentManagementData();
        } else {
            showToast(result.error || 'Error eliminando departamento', 'error');
        }
        
    } catch (error) {
        console.error('Error eliminando departamento:', error);
        showToast('Error eliminando departamento', 'error');
    }
};

// Función para manejar la creación de nuevo departamento
async function handleCreateDepartment(event) {
    event.preventDefault();
    
    const name = document.getElementById('new-department-name').value.trim();
    const description = document.getElementById('new-department-description').value.trim();
    
    if (!name) {
        showToast('El nombre del departamento es obligatorio', 'error');
        return;
    }
    
    try {
        const result = await createDepartment({
            nombre: name,
            descripcion: description
        });
        
        if (result.success) {
            showToast('Departamento creado exitosamente', 'success');
            
            // Limpiar formulario
            document.getElementById('new-department-name').value = '';
            document.getElementById('new-department-description').value = '';
            
            // Cerrar modal
            document.getElementById('new-department-modal').classList.add('hidden');
            
            // Recargar datos
            await loadDepartmentManagementData();
        } else {
            showToast(result.error || 'Error creando departamento', 'error');
        }
        
    } catch (error) {
        console.error('Error creando departamento:', error);
        showToast('Error creando departamento', 'error');
    }
}

// Función para manejar la edición de departamento
async function handleEditDepartment(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-department-id').value;
    const name = document.getElementById('edit-department-name').value.trim();
    const description = document.getElementById('edit-department-description').value.trim();
    
    if (!name) {
        showToast('El nombre del departamento es obligatorio', 'error');
        return;
    }
    
    try {
        const result = await updateDepartment(id, {
            nombre: name,
            descripcion: description
        });
        
        if (result.success) {
            showToast('Departamento actualizado exitosamente', 'success');
            
            // Cerrar modal
            const modal = document.getElementById('edit-department-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }
            
            // Recargar datos
            await loadDepartmentManagementData();
        } else {
            showToast(result.error || 'Error actualizando departamento', 'error');
        }
        
    } catch (error) {
        console.error('Error actualizando departamento:', error);
        showToast('Error actualizando departamento', 'error');
    }
}

// Función para inicializar la gestión de departamentos
export function initializeDepartmentManagement() {
    // Event listeners para botones de navegación
    const backButton = document.getElementById('btn-back-department-management');
    if (backButton) {
        backButton.addEventListener('click', showMainScreen);
    }

    // Event listeners para modales
    const newDepartmentBtn = document.getElementById('btn-new-department');
    const newDepartmentModal = document.getElementById('new-department-modal');
    const editDepartmentModal = document.getElementById('edit-department-modal');
    
    if (newDepartmentBtn && newDepartmentModal) {
        newDepartmentBtn.addEventListener('click', () => {
            newDepartmentModal.style.display = 'flex';
            newDepartmentModal.classList.remove('hidden');
        });
    }

    // Event listeners para cerrar modales
    const closeButtons = document.querySelectorAll('[data-modal-close]');
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal-close');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }
        });
    });

    // Event listeners para formularios
    const newDepartmentForm = document.getElementById('new-department-form');
    const editDepartmentForm = document.getElementById('edit-department-form');
    
    if (newDepartmentForm) {
        newDepartmentForm.addEventListener('submit', handleCreateDepartment);
    }
    
    if (editDepartmentForm) {
        editDepartmentForm.addEventListener('submit', handleEditDepartment);
    }

    console.log('Gestión de departamentos inicializada');
}
