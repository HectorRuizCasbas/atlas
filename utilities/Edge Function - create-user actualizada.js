// Edge Function: create-user (ACTUALIZADA)
// Crear usuario con nuevos campos: role, departamento_id, full_name
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Crear cliente de Supabase con service role key
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Obtener datos del request
    const { email, password, username, full_name, role = 'Usuario', departamento_id } = await req.json();
    // Validaciones básicas
    if (!email || !password || !username || !full_name) {
      return new Response(JSON.stringify({
        error: 'Email, contraseña, usuario y nombre completo son requeridos'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Validar formato de email
    if (!email.endsWith('@zelenza.com')) {
      return new Response(JSON.stringify({
        error: 'Solo se permiten emails del dominio @zelenza.com'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Validar que el rol sea válido
    const validRoles = [
      'Usuario',
      'Coordinador',
      'Responsable',
      'Administrador'
    ];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({
        error: 'Rol no válido'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Verificar si el departamento existe (si se proporciona)
    if (departamento_id) {
      const { data: department, error: deptError } = await supabaseAdmin.from('departamentos').select('id').eq('id', departamento_id).single();
      if (deptError || !department) {
        return new Response(JSON.stringify({
          error: 'Departamento no válido'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 400
        });
      }
    }
    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authError) {
      console.error('Error creando usuario en Auth:', authError);
      // Traducir errores comunes de Supabase Auth
      let errorMessage = 'Error al crear usuario';
      if (authError.message.includes('User already registered')) {
        errorMessage = 'Este email ya está registrado';
      } else if (authError.message.includes('email')) {
        errorMessage = 'Email no válido';
      } else if (authError.message.includes('password')) {
        errorMessage = 'Contraseña no válida (mínimo 6 caracteres)';
      }
      return new Response(JSON.stringify({
        error: errorMessage
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Crear perfil en la tabla profiles
    const { data: profileData, error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.user.id,
      username: username,
      email: email,
      full_name: full_name,
      role: role,
      departamento_id: departamento_id || null,
      lastActivity: new Date().toISOString()
    }).select().single();
    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Si falla la creación del perfil, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return new Response(JSON.stringify({
        error: 'Error creando perfil de usuario'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Crear notificación de bienvenida
    try {
      await supabaseAdmin.from('notificaciones').insert({
        usuario_id: authUser.user.id,
        tipo: 'solicitud_acceso',
        mensaje: `¡Bienvenido a Atlas! Tu cuenta ha sido creada exitosamente como ${role}.`,
        leida: false
      });
    } catch (notifError) {
      console.error('Error creando notificación de bienvenida:', notifError);
    // No fallar por esto, es opcional
    }
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        username: profileData.username,
        full_name: profileData.full_name,
        role: profileData.role,
        departamento_id: profileData.departamento_id
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error general:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
