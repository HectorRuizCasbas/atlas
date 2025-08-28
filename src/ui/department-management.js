// src/ui/department-management.js

import { getDepartments, getCurrentUserProfile, getVisibleUsers, createDepartment, updateDepartment, deleteDepartment } from '../api/supabase.js';
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
        await Promise.all([
            loadDepartments(),
            loadUsers()
        ]);
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
        currentDepartments = await getDepartments();
        console.log('Departamentos cargados:', currentDepartments);
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

// Función para editar departamento
window.editDepartment = function(departmentId) {
    const department = currentDepartments.find(d => d.id === departmentId);
    if (!department) {
        showToast('Departamento no encontrado', 'error');
        return;
    }

    // Llenar el modal de edición
    document.getElementById('edit-department-id').value = department.id;
    document.getElementById('edit-department-name').value = department.nombre;
    document.getElementById('edit-department-description').value = department.descripcion || '';

    // Mostrar modal
    document.getElementById('edit-department-modal').classList.remove('hidden');
};

// Función para eliminar departamento
window.deleteDepartment = async function(departmentId) {
    const department = currentDepartments.find(d => d.id === departmentId);
    if (!department) {
        showToast('Departamento no encontrado', 'error');
        return;
    }

    // Verificar si tiene usuarios
    const departmentUsers = currentUsers.filter(user => user.departamento_id === departmentId);
    if (departmentUsers.length > 0) {
        showToast('No se puede eliminar un departamento que tiene usuarios asignados', 'error');
        return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar el departamento "${department.nombre}"?`)) {
        return;
    }

    try {
        const result = await deleteDepartment(departmentId);
        
        if (result.success) {
            showToast('Departamento eliminado exitosamente', 'success');
            
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
            document.getElementById('edit-department-modal').classList.add('hidden');
            
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
