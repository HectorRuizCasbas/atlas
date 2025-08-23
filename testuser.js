import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://upbgpmcibngxukwaaiqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYmdwbWNpYm5neHVrd2FhaXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTgxNzksImV4cCI6MjA3MTUzNDE3OX0.i-rR4f5P4RNXPppcq1VxKyyeZdKE7yFPPOa96slVw94'; // <-- Cambia esto

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  try {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hruiz@zelenza.com',
        username: 'hruiz',
        password: '123456'
      })
    });

    if (error) {
      console.error('Error en la función:', error);
      return;
    }

    console.log('Respuesta:', data);
  } catch (err) {
    console.error('Error inesperado:', err);
  }
}

test();
