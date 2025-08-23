import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm'

const SUPABASE_URL = 'https://upbgpmcibngxukwaaiqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYmdwbWNpYm5neHVrd2FhaXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTgxNzksImV4cCI6MjA3MTUzNDE3OX0.i-rR4f5P4RNXPppcq1VxKyyeZdKE7yFPPOa96slVw94';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function createNewUser(username, password) {
  if (!username || !password) return { error: 'Nombre de usuario o contraseña vacíos.' };

  const email = `${username}@zelenza.com`;

  try {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }) // 🔹 Aquí se convierte a string JSON
    });

    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };

    return { user: data.user, message: data.message };
  } catch (err) {
    console.error("Error en la función:", err);
    return { error: err.message };
  }
}
