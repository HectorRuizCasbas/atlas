import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://upbgpmcibngxukwaaiqh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYmdwbWNpYm5neHVrd2FhaXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTgxNzksImV4cCI6MjA3MTUzNDE3OX0.i-rR4f5P4RNXPppcq1VxKyyeZdKE7yFPPOa96slVw94';
const supabase = createClient(supabaseUrl, supabaseKey);

const btnCreateUser = document.getElementById('btn-create-user');
const usernameInput = document.getElementById('new-username');
const passwordInput = document.getElementById('new-password');
const repeatPasswordInput = document.getElementById('repeat-password');
const emailInput = document.getElementById('new-email'); // opcional
const createUserError = document.getElementById('create-user-error');

btnCreateUser.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const repeatPassword = repeatPasswordInput.value.trim();
    let email = emailInput?.value.trim() || '';

    createUserError.classList.add('hidden');

    if (!username || !password || !repeatPassword) {
        createUserError.textContent = 'Todos los campos son obligatorios';
        createUserError.classList.remove('hidden');
        return;
    }

    if (password !== repeatPassword) {
        createUserError.textContent = 'Las contraseñas no coinciden';
        createUserError.classList.remove('hidden');
        return;
    }

    // Email automático
    if (!email) {
        if (username.toLowerCase() === 'hruiz') {
            email = 'hruiz@zelenza.com';
        } else {
            email = `${username}@zelenza.com`; // opcional: si quieres auto-email
        }
    }

    // Crear usuario en supabase
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        createUserError.textContent = error.message;
        createUserError.classList.remove('hidden');
        return;
    }

    // Insertar en tabla profiles
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: data.user.id,
            username,
            role: 'Usuario',
            supervisedUsers: [],
            lastActivity: new Date().toISOString()
        }]);

    if (profileError) {
        createUserError.textContent = profileError.message;
        createUserError.classList.remove('hidden');
        return;
    }

    // Usuario creado correctamente
    alert('Usuario creado correctamente. Revisa tu email para activar la cuenta.');
    usernameInput.value = '';
    passwordInput.value = '';
    repeatPasswordInput.value = '';
    if(emailInput) emailInput.value = '';
    closeModal();
});
