// src/api/supabase.js

// URL del endpoint de la Función Edge. 
// IMPORTANTE: Reemplaza <tu-referencia-proyecto> con tu referencia real de Supabase
const SUPABASE_EDGE_FUNCTION_URL = 'https://upbgpmcibngxukwaaiqh.supabase.co/functions/v1/create-user';
/**
 * Envía una solicitud de creación de usuario a la función Edge de Supabase.
 * @param {object} userData Los datos del usuario (email, password, username).
 * @returns {Promise<object>} Una promesa que resuelve con la respuesta de la API.
 */
export const createUser = async (userData) => {
    try {
        const response = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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