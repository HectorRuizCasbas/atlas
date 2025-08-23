// Aseguramos que el DOM esté cargado
document.addEventListener("DOMContentLoaded", () => {
  // === VARIABLES DEL DOM ===
  const btnNewUser = document.getElementById("btn-new-user");
  const modalNewUser = document.getElementById("modal-new-user");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnCreateUser = document.getElementById("btn-create-user");
  const inputUsername = document.getElementById("new-username");
  const inputPassword = document.getElementById("new-password");
  const inputPassword2 = document.getElementById("new-password2");
  const inputEmail = document.getElementById("new-email");

  // === MOSTRAR MODAL ===
  btnNewUser.addEventListener("click", () => {
    modalNewUser.classList.remove("hidden");
  });

  // === CERRAR MODAL ===
  btnCloseModal.addEventListener("click", () => {
    modalNewUser.classList.add("hidden");
    inputUsername.value = "";
    inputPassword.value = "";
    inputPassword2.value = "";
    inputEmail.value = "";
  });

  // === CREAR USUARIO ===
  btnCreateUser.addEventListener("click", async () => {
    const username = inputUsername.value.trim();
    const password = inputPassword.value;
    const password2 = inputPassword2.value;
    let email = inputEmail.value.trim();

    if (!username || !password || !password2) {
      alert("Todos los campos son obligatorios");
      return;
    }
    if (password !== password2) {
      alert("Las contraseñas no coinciden");
      return;
    }

    // Generar email si es hruiz
    if (username.toLowerCase() === "hruiz" && !email) {
      email = "hruiz@zelenza.com";
    }

    try {
      // Insertar en Supabase autenticación
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // opcional según tu Supabase
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      // Insertar en tabla profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: userId,
            username: username,
            role: "Usuario",
            supervisedUsers: [],
            last_activity: new Date().toISOString(),
            email: email,
          },
        ]);
      if (profileError) throw profileError;

      alert("Usuario creado correctamente");
      modalNewUser.classList.add("hidden");
      inputUsername.value = "";
      inputPassword.value = "";
      inputPassword2.value = "";
      inputEmail.value = "";
    } catch (err) {
      console.error(err);
      alert("Error al crear el usuario: " + err.message);
    }
  });
});
