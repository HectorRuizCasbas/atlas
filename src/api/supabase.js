// src/api/supabase.js

// URLs de los endpoints de las Funciones Edge
const SUPABASE_CREATE_USER_URL = 'https://upbgpmcibngxukwaaiqh.supabase.co/functions/v1/create-user';
const SUPABASE_CREATE_TASK_URL = 'https://upbgpmcibngxukwaaiqh.supabase.co/functions/v1/create-task';

// IMPORTANTE: Reemplaza con tu ANON KEY de Supabase (no la service role key)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYmdwbWNpYm5neHVrd2FhaXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTgxNzksImV4cCI6MjA3MTUzNDE3OX0.i-rR4f5P4RNXPppcq1VxKyyeZdKE7yFPPOa96slVw94';
/**
 * Inicializa el cliente de Supabase para autenticación
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://upbgpmcibngxukwaaiqh.supabase.co';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Realiza login con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<object>} - Resultado del login
 */
export const loginUser = async (email, password) => {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw new Error(error.message);
        }

        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Envía una solicitud de creación de usuario a la función Edge de Supabase.
 * @param {object} userData Los datos del usuario (email, password, username).
 * @returns {Promise<object>} Una promesa que resuelve con la respuesta de la API.
 */
export const createUser = async (userData) => {
    try {
        console.log('createUser: Enviando datos:', JSON.stringify(userData, null, 2));
        
        const response = await fetch(SUPABASE_CREATE_USER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(userData)
        });

        console.log('createUser: Response status:', response.status);
        const result = await response.json();
        console.log('createUser: Response data:', JSON.stringify(result, null, 2));
        
        // Verificar si la respuesta fue exitosa (código de estado 200).
        if (!response.ok) {
            // Manejar errores devueltos por la función Edge.
            throw new Error(result.error || 'Error desconocido al crear el usuario.');
        }

        return result;
    } catch (error) {
        console.error('Error en la petición a la API:', error);
        throw error;
    }
};

/**
 * Crea una nueva tarea usando la función Edge de Supabase
 * @param {object} taskData Los datos de la tarea (titulo, descripcion, prioridad, asignado_a, privada)
 * @returns {Promise<object>} Una promesa que resuelve con la respuesta de la API
 */
export const createTask = async (taskData) => {
    try {
        // Obtener el token de la sesión actual
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No hay sesión activa');
        }

        const response = await fetch(SUPABASE_CREATE_TASK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error desconocido al crear la tarea.');
        }

        return result;
    } catch (error) {
        console.error('Error en la petición para crear tarea:', error);
        throw error;
    }
};

/**
 * Obtiene el perfil del usuario actual con información completa
 * @returns {Promise<object>} - Perfil del usuario actual
 */
export const getCurrentUserProfile = async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No hay sesión activa');
        }

        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select(`
                id, 
                username, 
                full_name, 
                role, 
                email,
                departamento_id,
                lastActivity,
                departamentos!departamento_id(id, nombre, descripcion)
            `)
            .eq('id', session.user.id)
            .single();

        if (error) {
            throw new Error('Error obteniendo perfil del usuario');
        }

        return profile;
    } catch (error) {
        console.error('Error obteniendo perfil actual:', error);
        throw error;
    }
};

/**
 * Obtiene los usuarios supervisados por el usuario actual
 * @returns {Promise<Array>} - Lista de usuarios supervisados
 */
export const getSupervisedUsers = async () => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo devolver el usuario actual ya que no hay supervisedUsers
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('id, username, full_name')
            .eq('id', currentProfile.id);

        if (error) {
            throw new Error('Error obteniendo usuarios supervisados');
        }

        return users || [];
    } catch (error) {
        console.error('Error obteniendo usuarios supervisados:', error);
        throw error;
    }
};

/**
 * Obtiene las tareas que el usuario puede ver según sus permisos
 * @param {string} filterStatus - Filtro de estado ('OPEN_TASKS' para abiertas, '' para todas, o estado específico)
 * @param {object} filters - Filtros adicionales (priority, assigned_to, text)
 * @returns {Promise<Array>} - Lista de tareas
 */
export const getUserTasks = async (filterStatus = 'OPEN_TASKS', filters = {}) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo puede ver sus propias tareas ya que no hay supervisedUsers
        const visibleUserIds = [currentProfile.id];

        let query = supabaseClient
            .from('tasks')
            .select(`
                id,
                titulo,
                descripcion,
                creador,
                asignado_a,
                prioridad,
                estado,
                privada,
                departamento,
                created_at,
                updated_at,
                creator_profile:creador(id, username, full_name),
                assigned_profile:asignado_a(id, username, full_name)
            `)
            .or(`creador.in.(${visibleUserIds.join(',')}),asignado_a.in.(${visibleUserIds.join(',')})`)
            .order('updated_at', { ascending: false });

        // Filtrar tareas privadas: solo mostrar si el usuario es el creador
        query = query.or(`privada.eq.false,and(privada.eq.true,creador.eq.${currentProfile.id})`);

        // Aplicar filtro de estado
        if (filterStatus === 'OPEN_TASKS') {
            query = query.neq('estado', 'Finalizada');
        } else if (filterStatus && filterStatus !== '') {
            query = query.eq('estado', filterStatus);
        }

        // Aplicar filtros adicionales
        if (filters.priority && filters.priority !== '') {
            query = query.eq('prioridad', filters.priority);
        }

        if (filters.assigned_to && filters.assigned_to !== '') {
            query = query.eq('assigned_profile.username', filters.assigned_to);
        }

        if (filters.text && filters.text.trim() !== '') {
            const searchText = filters.text.trim();
            query = query.or(`titulo.ilike.%${searchText}%,descripcion.ilike.%${searchText}%`);
        }

        const { data: tasks, error } = await query;

        if (error) {
            throw new Error('Error obteniendo tareas');
        }

        return tasks || [];
    } catch (error) {
        console.error('Error obteniendo tareas del usuario:', error);
        throw error;
    }
};

/**
 * Obtiene una tarea específica con su historial
 * @param {string} taskId - ID de la tarea
 * @returns {Promise<object>} - Tarea con historial
 */
export const getTaskWithHistory = async (taskId) => {
    try {
        // Obtener la tarea
        const { data: task, error: taskError } = await supabaseClient
            .from('tasks')
            .select(`
                id,
                titulo,
                descripcion,
                creador,
                asignado_a,
                prioridad,
                estado,
                privada,
                departamento,
                created_at,
                updated_at,
                creator_profile:creador(id, username, full_name),
                assigned_profile:asignado_a(id, username, full_name)
            `)
            .eq('id', taskId)
            .single();

        if (taskError) {
            throw new Error('Error obteniendo tarea');
        }

        // Obtener el historial
        const { data: history, error: historyError } = await supabaseClient
            .from('task_history')
            .select(`
                id,
                campo_modificado,
                valor_anterior,
                valor_nuevo,
                comentario,
                created_at,
                usuario_profile:usuario_id(id, username, full_name)
            `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (historyError) {
            throw new Error('Error obteniendo historial');
        }

        return {
            task,
            history: history || []
        };
    } catch (error) {
        console.error('Error obteniendo tarea con historial:', error);
        throw error;
    }
};

/**
 * Envía un mensaje de chat para una tarea
 * @param {string} taskId - ID de la tarea
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<object>} - Resultado del envío
 */
export const sendChatMessage = async (taskId, message) => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No hay sesión activa');
        }

        const currentProfile = await getCurrentUserProfile();

        // Insertar mensaje en el historial
        const { data: newMessage, error } = await supabaseClient
            .from('task_history')
            .insert({
                task_id: taskId,
                usuario_id: currentProfile.id,
                campo_modificado: 'chat_message',
                valor_anterior: null,
                valor_nuevo: message.trim(),
                comentario: null
            })
            .select(`
                id,
                campo_modificado,
                valor_anterior,
                valor_nuevo,
                comentario,
                created_at,
                usuario_profile:usuario_id(id, username, full_name)
            `)
            .single();

        if (error) {
            throw new Error('Error enviando mensaje');
        }

        return newMessage;
    } catch (error) {
        console.error('Error enviando mensaje de chat:', error);
        throw error;
    }
};

/**
 * Suscribe a cambios en tiempo real del historial de una tarea
 * @param {string} taskId - ID de la tarea
 * @param {function} callback - Función a ejecutar cuando hay cambios
 * @returns {object} - Suscripción de Supabase
 */
export const subscribeToTaskHistory = (taskId, callback) => {
    return supabaseClient
        .channel(`task_history_${taskId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'task_history',
                filter: `task_id=eq.${taskId}`
            },
            async (payload) => {
                // Obtener datos completos del nuevo registro
                const { data: newEntry } = await supabaseClient
                    .from('task_history')
                    .select(`
                        id,
                        campo_modificado,
                        valor_anterior,
                        valor_nuevo,
                        comentario,
                        created_at,
                        usuario_profile:usuario_id(id, username, full_name)
                    `)
                    .eq('id', payload.new.id)
                    .single();

                if (newEntry) {
                    callback(newEntry);
                }
            }
        )
        .subscribe();
};

/**
 * Obtiene todos los departamentos disponibles
 * @returns {Promise<Array>} - Lista de departamentos
 */
export const getDepartments = async () => {
    try {
        console.log('getDepartments: Iniciando consulta...');
        
        // Usar anon key directamente para consultas públicas como departamentos
        const { data: departments, error } = await supabaseClient
            .from('departamentos')
            .select('id, nombre, descripcion')
            .order('nombre');

        console.log('getDepartments: Respuesta de BD:', { departments, error });

        if (error) {
            console.error('getDepartments: Error de BD:', error);
            // Si es un error de autenticación o permisos, devolver departamentos por defecto
            if (error.message.includes('JWT') || error.message.includes('auth') || error.message.includes('permission') || error.message.includes('policy')) {
                console.log('getDepartments: Error de permisos, devolviendo departamentos por defecto');
                return [
                    { id: '1', nombre: 'Administración', descripcion: 'Departamento de Administración' },
                    { id: '2', nombre: 'Recursos Humanos', descripcion: 'Departamento de RRHH' },
                    { id: '3', nombre: 'Tecnología', descripcion: 'Departamento de IT' },
                    { id: '4', nombre: 'Ventas', descripcion: 'Departamento de Ventas' },
                    { id: '5', nombre: 'Marketing', descripcion: 'Departamento de Marketing' }
                ];
            }
            throw new Error(`Error obteniendo departamentos: ${error.message}`);
        }

        console.log('getDepartments: Departamentos obtenidos:', departments?.length || 0);
        return departments || [];
    } catch (error) {
        console.error('Error obteniendo departamentos:', error);
        // En caso de error, devolver departamentos por defecto para no romper la UI
        console.log('getDepartments: Devolviendo departamentos por defecto debido a error');
        return [
            { id: '1', nombre: 'Administración', descripcion: 'Departamento de Administración' },
            { id: '2', nombre: 'Recursos Humanos', descripcion: 'Departamento de RRHH' },
            { id: '3', nombre: 'Tecnología', descripcion: 'Departamento de IT' },
            { id: '4', nombre: 'Ventas', descripcion: 'Departamento de Ventas' },
            { id: '5', nombre: 'Marketing', descripcion: 'Departamento de Marketing' }
        ];
    }
};

/**
 * Obtiene usuarios según los permisos del usuario actual
 * @returns {Promise<Array>} - Lista de usuarios visibles
 */
export const getVisibleUsers = async () => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        let query = supabaseClient
            .from('profiles')
            .select(`
                id, 
                username, 
                full_name, 
                role, 
                email,
                departamento_id,
                lastActivity,
                departamentos!departamento_id(id, nombre, descripcion)
            `);

        // Aplicar filtros según el rol del usuario
        if (currentProfile.role === 'Administrador') {
            // Admins pueden ver todos los usuarios
            query = query.order('username');
        } else if (currentProfile.role === 'Responsable' || currentProfile.role === 'Coordinador') {
            // Responsables y coordinadores ven usuarios de su departamento
            if (currentProfile.departamento_id) {
                query = query.eq('departamento_id', currentProfile.departamento_id).order('username');
            } else {
                // Si no tiene departamento, solo se ve a sí mismo
                query = query.eq('id', currentProfile.id);
            }
        } else {
            // Usuarios normales solo se ven a sí mismos
            query = query.eq('id', currentProfile.id);
        }

        const { data: users, error } = await query;

        if (error) {
            throw new Error('Error obteniendo usuarios');
        }

        return users || [];
    } catch (error) {
        console.error('Error obteniendo usuarios visibles:', error);
        throw error;
    }
};

/**
 * Actualiza la última actividad del usuario actual
 * @returns {Promise<void>}
 */
export const updateLastActivity = async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            return;
        }

        await supabaseClient
            .from('profiles')
            .update({ lastActivity: new Date().toISOString() })
            .eq('id', session.user.id);

    } catch (error) {
        console.error('Error actualizando última actividad:', error);
    }
};

/**
 * Obtiene todos los usuarios (solo para administradores)
 * @returns {Promise<Array>} - Lista de todos los usuarios
 */
export const getAllUsers = async () => {
    try {
        console.log('getAllUsers: Iniciando...');
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        console.log('getAllUsers: Sesión obtenida:', session ? 'Activa' : 'No activa');
        
        if (!session) {
            throw new Error('No hay sesión activa');
        }

        const currentProfile = await getCurrentUserProfile();
        console.log('getAllUsers: Perfil actual:', currentProfile);
        
        // Solo administradores pueden ver todos los usuarios
        if (currentProfile.role !== 'Administrador') {
            throw new Error('No tienes permisos para ver todos los usuarios');
        }

        console.log('getAllUsers: Consultando base de datos...');
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select(`
                id, 
                username, 
                full_name, 
                role, 
                email,
                departamento_id,
                lastActivity,
                departamentos!departamento_id(id, nombre, descripcion)
            `)
            .order('username');

        console.log('getAllUsers: Respuesta de BD:', { users, error });

        if (error) {
            console.error('getAllUsers: Error de BD:', error);
            throw new Error(`Error obteniendo usuarios: ${error.message}`);
        }

        console.log('getAllUsers: Usuarios obtenidos:', users?.length || 0);
        return users || [];
    } catch (error) {
        console.error('Error obteniendo todos los usuarios:', error);
        throw error;
    }
};

/**
 * Actualiza un usuario (solo para administradores)
 * @param {string} userId - ID del usuario a actualizar
 * @param {object} updateData - Datos a actualizar
 * @returns {Promise<object>} - Resultado de la actualización
 */
export const updateUser = async (userId, updateData) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo administradores pueden actualizar usuarios
        if (currentProfile.role !== 'Administrador') {
            throw new Error('No tienes permisos para actualizar usuarios');
        }

        // Si se incluye contraseña, actualizar en auth
        if (updateData.password) {
            const { error: authError } = await supabaseClient.auth.admin.updateUserById(
                userId,
                { password: updateData.password }
            );
            
            if (authError) {
                throw new Error('Error actualizando contraseña: ' + authError.message);
            }
            
            // Remover password de updateData para no enviarlo a profiles
            delete updateData.password;
        }

        // Actualizar perfil
        const { data: updatedUser, error } = await supabaseClient
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw new Error('Error actualizando usuario: ' + error.message);
        }

        return { success: true, user: updatedUser };
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Elimina un usuario (solo para administradores)
 * @param {string} userId - ID del usuario a eliminar
 * @returns {Promise<object>} - Resultado de la eliminación
 */
export const deleteUser = async (userId) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo administradores pueden eliminar usuarios
        if (currentProfile.role !== 'Administrador') {
            throw new Error('No tienes permisos para eliminar usuarios');
        }

        // No permitir auto-eliminación
        if (userId === currentProfile.id) {
            throw new Error('No puedes eliminar tu propia cuenta desde aquí');
        }

        // Eliminar de auth (esto también eliminará de profiles por CASCADE)
        const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId);
        
        if (authError) {
            throw new Error('Error eliminando usuario: ' + authError.message);
        }

        return { success: true };
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Verifica si hay una sesión activa
 * @returns {Promise<boolean>} - true si hay sesión activa, false si no
 */
export const hasActiveSession = async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session !== null;
    } catch (error) {
        console.error('Error verificando sesión:', error);
        return false;
    }
};

/**
 * Crea un nuevo departamento (solo para administradores)
 * @param {object} departmentData - Datos del departamento (nombre, descripcion)
 * @returns {Promise<object>} - Resultado de la creación
 */
export const createDepartment = async (departmentData) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo administradores pueden crear departamentos
        if (currentProfile.role !== 'Administrador') {
            throw new Error('No tienes permisos para crear departamentos');
        }

        const { data: newDepartment, error } = await supabaseClient
            .from('departamentos')
            .insert({
                nombre: departmentData.nombre,
                descripcion: departmentData.descripcion || null
            })
            .select()
            .single();

        if (error) {
            throw new Error('Error creando departamento: ' + error.message);
        }

        return { success: true, department: newDepartment };
    } catch (error) {
        console.error('Error creando departamento:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Actualiza un departamento (solo para administradores)
 * @param {string} departmentId - ID del departamento a actualizar
 * @param {object} updateData - Datos a actualizar
 * @returns {Promise<object>} - Resultado de la actualización
 */
export const updateDepartment = async (departmentId, updateData) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo administradores pueden actualizar departamentos
        if (currentProfile.role !== 'Administrador') {
            throw new Error('No tienes permisos para actualizar departamentos');
        }

        const { data: updatedDepartment, error } = await supabaseClient
            .from('departamentos')
            .update({
                nombre: updateData.nombre,
                descripcion: updateData.descripcion || null
            })
            .eq('id', departmentId)
            .select()
            .single();

        if (error) {
            throw new Error('Error actualizando departamento: ' + error.message);
        }

        return { success: true, department: updatedDepartment };
    } catch (error) {
        console.error('Error actualizando departamento:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Elimina un departamento (solo para administradores)
 * @param {string} departmentId - ID del departamento a eliminar
 * @returns {Promise<object>} - Resultado de la eliminación
 */
export const deleteDepartment = async (departmentId) => {
    try {
        const currentProfile = await getCurrentUserProfile();
        
        // Solo administradores pueden eliminar departamentos
        if (currentProfile.role !== 'Administrador') {
            throw new Error('No tienes permisos para eliminar departamentos');
        }

        // Verificar si el departamento tiene usuarios asignados
        const { data: users, error: usersError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('departamento_id', departmentId);

        if (usersError) {
            throw new Error('Error verificando usuarios del departamento');
        }

        if (users && users.length > 0) {
            throw new Error('No se puede eliminar un departamento que tiene usuarios asignados');
        }

        // Eliminar departamento
        const { error } = await supabaseClient
            .from('departamentos')
            .delete()
            .eq('id', departmentId);

        if (error) {
            throw new Error('Error eliminando departamento: ' + error.message);
        }

        return { success: true };
    } catch (error) {
        console.error('Error eliminando departamento:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Cierra la sesión del usuario actual
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        throw error;
    }
};