import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------
// Inicialización Supabase
// ---------------------
const SUPABASE_URL = 'https://nxurmbocyxjfwsvvtjlr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dXJtYm9jeXhqZndzdnZ0amxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDY3NDIsImV4cCI6MjA3MTQyMjc0Mn0.nnvT08cCxZR9IN1IvRPxMXs9Y4UuqhAYikYPCAZuqTQ'; // reemplaza con tu key completa
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------
// Placeholders para funciones no definidas aún
// ---------------------
function clearUI() { console.log('clearUI llamado'); }
function renderTasks(tasks) { console.log('renderTasks llamado', tasks); }
function renderUserList(users) { console.log('renderUserList llamado', users); }
function displayMessage(msg) { console.log('displayMessage', msg); }
function displayNotification(notif) { console.log('displayNotification', notif); }
function renderVisibilityList(list, containerId) { console.log('renderVisibilityList', list, containerId); }

// ---------------------
// Esperar a que el DOM esté cargado
// ---------------------
document.addEventListener('DOMContentLoaded', () => {

  // Log de prueba de conexión
  (async () => {
    const { data, error } = await supabase.from("profiles").select("*").limit(1);
    if (error) console.error("Error conectando a Supabase:", error.message);
    else console.log("Conexión OK ✅, perfiles:", data);
  })();

  // Manejo de autenticación
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, 'Session:', session);
    if (event === 'SIGNED_IN' && session) {
      const user = session.user;
      loadTasks();
      loadNotifications();
      checkAdminAccess(user);
    } else {
      clearUI();
    }
  });

  // Botón toggle de vista de tareas
  const toggleBtn = document.getElementById('toggle-view-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const table = document.getElementById('task-table');
      const cards = document.getElementById('task-cards');
      if (table && cards) {
        table.classList.toggle('hidden');
        cards.classList.toggle('hidden');
      }
    });
  }

  // Aquí puedes agregar más listeners del DOM si necesitas
});

// ---------------------
// Funciones de usuarios
// ---------------------
async function registerUser(username, password) {
  const email = `${username}@supabase.io`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'Usuario' } }
  });
  if (error) throw error;
  alert('Usuario registrado correctamente');
}

async function loginUser(username, password) {
  const email = `${username}@supabase.io`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function checkAdminAccess(user) {
  const role = user.user_metadata?.role;
  const adminSection = document.getElementById('user-admin-section');
  if (role !== 'Administrador' && adminSection) {
    adminSection.style.display = 'none';
  }
}

async function loadUsers() {
  const { data: users, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  renderUserList(users);
}

async function createUser(username, password, role) {
  const email = `${username}@supabase.io`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } }
  });
  if (error) throw error;
  alert('Usuario creado');
}

async function updateUser(userId, newRole) {
  const { data, error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) throw error;
}

async function deleteUser(userId) {
  alert('Usuario eliminado (requiere key de servicio)');
}

// ---------------------
// Funciones de tareas
// ---------------------
async function createTask(task) {
  const { error } = await supabase.from('tasks').insert(task);
  if (error) throw error;
  loadTasks();
}

async function loadTasks() {
  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  const userId = user.id;

  const { data: visibleRows } = await supabase
    .from('visibility')
    .select('visible_user_id')
    .eq('viewer_id', userId);

  const visibleIds = visibleRows.map(r => r.visible_user_id).join(',');

  let query = supabase.from('tasks').select('*');
  const filter = [];
  filter.push(`creator_id.eq.${userId}`);
  filter.push(`assigned_to_id.eq.${userId}`);
  if (visibleIds) filter.push(`creator_id.in.(${visibleIds})`);
  query = query.or(filter.join(','));

  const { data: tasks, error } = await query.order('priority', { ascending: false });
  if (error) throw error;
  renderTasks(tasks);
}

async function updateTask(id, updates) {
  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw error;
  logTaskChange(id, updates);
  loadTasks();
}

async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  loadTasks();
}

async function logTaskChange(taskId, updates) {
  const userResp = await supabase.auth.getUser();
  const userId = userResp.data.user.id;

  const { data: oldTask } = await supabase.from('tasks').select('*').eq('id', taskId).single();

  for (const field in updates) {
    const oldValue = oldTask[field];
    const newValue = updates[field];
    if (oldValue !== newValue) {
      const timestamp = new Date().toLocaleTimeString('es-ES', { hour:'2-digit',minute:'2-digit'}) + ' ' + new Date().toLocaleDateString('es-ES');
      await supabase.from('task_history').insert({
        task_id: taskId,
        user_id: userId,
        field,
        old_value: oldValue,
        new_value: newValue,
        changed_at: timestamp
      });
    }
  }
}

// ---------------------
// Funciones de chat
// ---------------------
function subscribeChat(taskId) {
  supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${taskId}` }, payload => {
      displayMessage(payload.new);
    })
    .subscribe();
}

async function sendMessage(taskId, content) {
  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  await supabase.from('messages').insert({
    task_id: taskId,
    user_id: user.id,
    content,
    created_at: new Date().toISOString()
  });
}

// ---------------------
// Funciones de notificaciones
// ---------------------
function subscribeNotifications(userId) {
  supabase
    .channel('public:notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
      displayNotification(payload.new);
    })
    .subscribe();
}

async function loadNotifications() {
  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  const { data: notes } = await supabase.from('notifications').select('*').eq('user_id', user.id);
  notes.forEach(displayNotification);
}

async function clearNotifications(userId) {
  await supabase.from('notifications').delete().eq('user_id', userId);
}

// ---------------------
// Cambiar contraseña
// ---------------------
async function changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  alert('Contraseña actualizada');
}

// ---------------------
// Modal de ayuda y visibilidad
// ---------------------
async function loadHelp() {
  const res = await fetch('/help/contenido.html');
  const html = await res.text();
  const container = document.getElementById('help-modal-body');
  if (container) container.innerHTML = html;
}

async function loadVisibilityModal() {
  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;

  const { data: IcanSee } = await supabase.from('visibility').select('visible_user_id').eq('viewer_id', user.id);
  const { data: seeMe } = await supabase.from('visibility').select('viewer_id').eq('visible_user_id', user.id);

  renderVisibilityList(IcanSee, 'visibilidad-sobre-mi');
  renderVisibilityList(seeMe, 'visibilidad-de-mi');
}
