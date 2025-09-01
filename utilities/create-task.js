// Edge Function para crear tareas
// Archivo: supabase/functions/create-task/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el usuario autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parsear el cuerpo de la petición
    const { titulo, descripcion, prioridad, assigned_to, departamento, privada } = await req.json()

    // Validaciones
    if (!titulo || titulo.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'El título es obligatorio' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obtener el perfil del usuario creador
    const { data: creatorProfile, error: creatorError } = await supabaseClient
      .from('profiles')
      .select('id, username, full_name')
      .eq('id', user.id)
      .single()

    if (creatorError || !creatorProfile) {
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener el perfil del usuario' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obtener el perfil del usuario asignado (si existe)
    let assignedProfile = null;
    if (assigned_to && assigned_to.trim() !== '') {
      const { data: profile, error: assignedError } = await supabaseClient
        .from('profiles')
        .select('id, username, full_name')
        .eq('id', assigned_to)
        .single()

      if (assignedError || !profile) {
        return new Response(
          JSON.stringify({ error: 'Usuario asignado no encontrado' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      assignedProfile = profile;
    }

    // Crear la tarea
    const { data: newTask, error: taskError } = await supabaseClient
      .from('tasks')
      .insert({
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        creador: creatorProfile.id,
        asignado_a: assignedProfile ? assignedProfile.id : null,
        prioridad: prioridad || 'Media',
        estado: 'Sin iniciar',
        privada: privada || false,
        departamento: departamento || null
      })
      .select()
      .single()

    if (taskError) {
      console.error('Error creando tarea:', taskError)
      return new Response(
        JSON.stringify({ error: 'Error al crear la tarea' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Crear entradas en el historial
    const now = new Date()
    const formattedDate = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
    const formattedTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const historyEntries = [
      {
        task_id: newTask.id,
        usuario_id: creatorProfile.id,
        campo_modificado: 'creacion',
        valor_anterior: null,
        valor_nuevo: 'Tarea creada',
        comentario: `[${creatorProfile.full_name || creatorProfile.username}] Tarea creada. (${formattedDate}, ${formattedTime})`
      }
    ];

    // Solo agregar entrada de asignación si hay usuario asignado
    if (assignedProfile) {
      historyEntries.push({
        task_id: newTask.id,
        usuario_id: creatorProfile.id,
        campo_modificado: 'asignacion',
        valor_anterior: null,
        valor_nuevo: assignedProfile.full_name || assignedProfile.username,
        comentario: `[${creatorProfile.full_name || creatorProfile.username}] Asignada a: ${assignedProfile.full_name || assignedProfile.username} (${formattedDate}, ${formattedTime})`
      });
    }

    const { error: historyError } = await supabaseClient
      .from('task_history')
      .insert(historyEntries)

    if (historyError) {
      console.error('Error creando historial:', historyError)
      // No fallar la creación de la tarea por error en historial
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        task: newTask,
        message: 'Tarea creada correctamente'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error general:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
