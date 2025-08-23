// ---------------------- LOGIN ----------------------
const btnLogin = document.getElementById('btn-login');
const loginUserInput = document.getElementById('login-username');
const loginPassInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error-message');

const screenLogin = document.getElementById('screen-login');
const screenMain = document.getElementById('screen-main');
const currentUserSpan = document.getElementById('current-user');

// Usuarios de ejemplo
let users = [
    { username: 'admin', password: '244466666', role: 'Administrador' },
    { username: 'Héctor', password: '1234', role: 'Usuario' },
    { username: 'Agustín', password: '1234', role: 'Usuario' }
];

function authenticate(username, password) {
    return users.find(u => u.username === username && u.password === password);
}

btnLogin.addEventListener('click', () => {
    const username = loginUserInput.value.trim();
    const password = loginPassInput.value.trim();

    const user = authenticate(username, password);

    if (!user) {
        loginError.textContent = 'Usuario o contraseña incorrectos';
        loginError.classList.remove('hidden');
        return;
    }

    loginError.classList.add('hidden');
    loginUserInput.value = '';
    loginPassInput.value = '';

    currentUserSpan.textContent = user.username;

    screenLogin.classList.add('hidden');
    screenMain.classList.remove('hidden');
});

// ---------------------- MODAL ----------------------
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');

function openModal() {
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeModal);

// Ejemplo: abrir modal al hacer click en el nombre del usuario
currentUserSpan.addEventListener('click', openModal);

// ---------------------- CERRAR SESIÓN ----------------------
const btnLogout = document.getElementById('btn-logout');

btnLogout.addEventListener('click', () => {
    screenMain.classList.add('hidden');
    screenLogin.classList.remove('hidden');
    currentUserSpan.textContent = '';
});
