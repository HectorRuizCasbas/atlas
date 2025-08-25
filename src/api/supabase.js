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
        const response = await fetch(SUPABASE_CREATE_USER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        
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
            .select('id, username, full_name, supervisedUsers')
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
        const supervisedUserIds = currentProfile.supervisedUsers || [];
        
        // Agregar el usuario actual a la lista
        const allUserIds = [currentProfile.id, ...supervisedUserIds];

        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('id, username, full_name')
            .in('id', allUserIds);

        if (error) {
            throw new Error('Error obteniendo usuarios supervisados');
        }

        return users || [];
    } catch (error) {
        console.error('Error obteniendo usuarios supervisados:', error);
        throw error;
    }
};