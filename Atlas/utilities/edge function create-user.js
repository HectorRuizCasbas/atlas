
// Edge Function: create-user
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { email, password, username, full_name, role = 'Usuario', departamento_id } = await req.json();
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
    if (!email.endsWith('@zelenza.com')) {
      return new Response(JSON.stringify({
        error: 'Solo se permiten usuarios con dominio @zelenza.com'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // 1. Crear el usuario en el módulo de autenticación de Supabase
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username,
        full_name: full_name,
        role: role
      }
    });
    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return new Response(JSON.stringify({
        error: authError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // 2. Esperar un momento (opcional) para asegurar que el trigger se ha disparado.
    // Esto es un 'hack' para evitar race conditions, aunque no debería ser necesario.
    // await new Promise(resolve => setTimeout(resolve, 500));
    // 3. ACTUALIZAR la fila del perfil que ya existe con los datos adicionales.
    const { data: profileData, error: profileError } = await supabaseAdmin.from('profiles').update({
      username: username,
      full_name: full_name,
      email: email,
      role: role,
      departamento_id: departamento_id,
      lastActivity: new Date().toISOString()
    }).eq('id', authUser.user.id).select();
    if (profileError) {
      console.error('Error actualizando perfil:', profileError);
      // Eliminar el usuario de auth para evitar un estado incompleto
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
    // Crear notificación de bienvenida (opcional)
    try {
      await supabaseAdmin.from('notificaciones').insert({
        usuario_id: authUser.user.id,
        tipo: 'solicitud_acceso',
        mensaje: `¡Bienvenido a Atlas! Tu cuenta ha sido creada exitosamente como ${role}.`,
        leida: false
      });
    } catch (notifError) {
      console.error('Error creando notificación de bienvenida:', notifError);
    }
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        username: profileData[0].username,
        full_name: profileData[0].full_name,
        role: profileData[0].role,
        departamento_id: profileData[0].departamento_id
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
