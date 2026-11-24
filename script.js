const schedules = {
  "Matemática": ["Lunes, 3:00–4:00 p. m."],
  "Lenguaje": ["Miércoles, 3:00–4:00 p. m."],
  "Ciencias": ["Viernes, 2:00–3:00 p. m."]
};

const storageKey = "portalTutoriasRegistros";
const form = document.getElementById("registration-form");
const course = document.getElementById("course");
const studentName = document.getElementById("student-name");
const email = document.getElementById("email");
const schedule = document.getElementById("schedule");
const topic = document.getElementById("topic");
const message = document.getElementById("form-message");
const formTitle = document.getElementById("form-title");
const fields = [course, studentName, email, schedule]; // el tema es opcional: no se valida

/* jQuery solo aporta animaciones (desplazamiento suave y mensajes que se deslizan).
   Si no cargó (sin internet, por ejemplo), la página funciona igual sin ellas. */
const hasJq = typeof window.jQuery === "function";
if (hasJq && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  $.fx.off = true; // quien pidió menos movimiento en su sistema no ve animaciones
}

/* ---------- Almacenamiento ---------- */

function getRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

/* ---------- Validación (mensajes específicos por campo) ---------- */

const validators = {
  "course": () => (course.value ? "" : "Selecciona un curso."),
  "student-name": () => {
    const value = studentName.value.trim();
    if (!value) return "Escribe tu nombre completo.";
    return value.length < 3 ? "Escribe al menos 3 caracteres." : "";
  },
  "email": () => {
    if (!email.value.trim()) return "Ingresa tu correo electrónico.";
    return email.validity.valid ? "" : "Revisa el formato, por ejemplo: alumno@correo.com.";
  },
  "schedule": () => {
    if (schedule.value) return "";
    return course.value ? "Selecciona un horario." : "Primero selecciona un curso.";
  }
};

function showError(field, text) {
  document.getElementById(field.id + "-error").textContent = text;
  if (text) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
}

function validateField(field) {
  const error = validators[field.id]();
  showError(field, error);
  return !error;
}

// Valida todos los campos a la vez para mostrar todos los problemas juntos.
function validateForm() {
  return fields.map(validateField).every(Boolean);
}

// El error desaparece apenas el usuario corrige el campo.
fields.forEach(field => {
  const eventName = field.tagName === "SELECT" ? "change" : "input";
  field.addEventListener(eventName, () => {
    if (field.getAttribute("aria-invalid") === "true") validateField(field);
  });
});

/* ---------- Desplazamiento (jQuery: animate) ---------- */

function navHeight() {
  const nav = document.querySelector("nav");
  return nav ? nav.offsetHeight : 0;
}

// Lleva la vista hasta un elemento, dejándolo justo debajo del menú fijo.
function scrollToElement(el, done) {
  // «Inicio» sube hasta el comienzo de la página para mostrar también el encabezado.
  const top = el.id === "inicio"
    ? 0
    : el.getBoundingClientRect().top + window.pageYOffset - navHeight() - 10;
  if (hasJq) {
    // "html, body" son dos elementos: promise() asegura que done se ejecute una sola vez.
    $("html, body").stop(true).animate({ scrollTop: top }, 400).promise().done(() => {
      if (done) done();
    });
  } else {
    window.scrollTo(0, top);
    if (done) done();
  }
}

/* ---------- Mensajes (jQuery: slideDown) y horario ---------- */

function showMessage(type, text, reveal) {
  message.className = "notice " + type;
  message.textContent = text;
  if (!hasJq) return;
  $(message).stop(true, true).hide().slideDown(200);
  // Si el aviso quedó fuera de pantalla (por encima), lleva la vista hasta él.
  if (reveal && message.getBoundingClientRect().top < navHeight()) scrollToElement(message);
}

function hideMessage() {
  if (hasJq) $(message).stop(true, true); // termina cualquier animación en curso
  message.className = "notice hidden";
  message.textContent = "";
}

function updateSchedules() {
  const options = schedules[course.value] || [];
  schedule.innerHTML = '<option value="">Selecciona un horario</option>';
  options.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    schedule.appendChild(option);
  });
  // Con un único horario no hay nada que decidir.
  if (options.length === 1) schedule.value = options[0];
  showError(schedule, "");
}

/* ---------- Resaltado ---------- */

// Marca la tarjeta del curso que se está registrando.
function highlightSelectedCard() {
  document.querySelectorAll(".card").forEach(card => {
    const button = card.querySelector("[data-course]");
    card.classList.toggle("selected", !!course.value && button.dataset.course === course.value);
  });
}

// Marca en el menú la sección que se está viendo.
function updateActiveLink() {
  const sections = document.querySelectorAll("section[id]");
  const line = navHeight() + 40; // línea de referencia, justo debajo del menú
  let current = sections[0].id;
  sections.forEach(section => {
    if (section.getBoundingClientRect().top <= line) current = section.id;
  });
  // Al llegar al final de la página, la última sección queda activa aunque no alcance la línea.
  if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2) {
    current = sections[sections.length - 1].id;
  }
  document.querySelectorAll("nav a").forEach(link => {
    if (link.getAttribute("href") === "#" + current) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

window.addEventListener("scroll", updateActiveLink, { passive: true });
window.addEventListener("resize", updateActiveLink);

function onCourseChange() {
  updateSchedules();
  highlightSelectedCard();
  showError(email, ""); // limpia un aviso de duplicado del curso anterior
  formTitle.textContent = course.value ? "Registro de " + course.value : "Registro de tutoría";
}

/* ---------- Lista de registros ---------- */

// highlightIndex: posición del registro recién creado, que se resalta un momento.
function renderRecords(highlightIndex) {
  const list = document.getElementById("records-list");
  const records = getRecords();
  list.replaceChildren();

  document.getElementById("records-count").textContent = records.length ? "(" + records.length + ")" : "";
  document.getElementById("clear-records").disabled = !records.length;

  if (!records.length) {
    const p = document.createElement("p");
    p.textContent = "Aún no hay registros.";
    list.appendChild(p);
    return;
  }

  records.forEach((record, index) => {
    const item = document.createElement("div");
    item.className = "record-item" + (index === highlightIndex ? " record-new" : "");

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = record.course + " — " + record.name;
    const details = document.createElement("p");
    details.textContent = record.schedule + " | " + record.email;
    text.append(title, details);
    if (record.topic) {
      const topicLine = document.createElement("p");
      topicLine.textContent = "Tema: " + record.topic;
      text.appendChild(topicLine);
    }

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "danger";
    cancel.textContent = "Cancelar registro";
    cancel.dataset.index = index;
    cancel.setAttribute("aria-label", "Cancelar registro de " + record.course);

    item.append(text, cancel);
    list.appendChild(item);
  });
}

/* ---------- Eventos ---------- */

document.querySelectorAll("[data-course]").forEach(button =>
  button.addEventListener("click", () => {
    course.value = button.dataset.course;
    onCourseChange();
    const firstField = studentName.value.trim() ? email : studentName;
    scrollToElement(document.getElementById("registro"), () => firstField.focus({ preventScroll: true }));
  })
);

// Enlaces del menú y de la portada: desplazamiento suave en lugar de salto brusco.
if (hasJq) {
  $('a[href^="#"]').on("click", function (event) {
    const hash = this.getAttribute("href");
    const target = hash.length > 1 ? document.querySelector(hash) : null;
    if (!target) return;
    event.preventDefault();
    scrollToElement(target, () => {
      target.setAttribute("tabindex", "-1"); // para que lectores de pantalla y teclado sigan desde ahí
      target.focus({ preventScroll: true });
      try { history.replaceState(null, "", hash); } catch (e) { /* la dirección no es esencial */ }
    });
  });
}

course.addEventListener("change", onCourseChange);

form.addEventListener("submit", event => {
  event.preventDefault();
  hideMessage();

  if (!validateForm()) {
    showMessage("error", "Revisa los campos señalados antes de confirmar tu registro.");
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  const record = {
    course: course.value,
    name: studentName.value.trim(),
    email: email.value.trim(),
    schedule: schedule.value,
    topic: topic.value.trim()
  };

  const records = getRecords();
  const duplicate = records.some(
    item => item.course === record.course && item.email.toLowerCase() === record.email.toLowerCase()
  );
  if (duplicate) {
    showError(email, "Este correo ya está registrado en " + record.course + ".");
    showMessage("error", "Ya tienes un registro en " + record.course + ". Puedes cancelarlo en «Mis registros».");
    email.focus();
    return;
  }

  try {
    records.push(record);
    saveRecords(records);
  } catch (e) {
    showMessage("error", "No se pudo guardar el registro en este navegador.");
    return;
  }

  form.reset();
  showMessage("success", "¡Listo! Quedaste registrado en " + record.course + ": " + record.schedule + ".", true);
  renderRecords(records.length - 1);
});

// Se ejecuta tras el reinicio (el navegador restaura los valores después del evento).
form.addEventListener("reset", () =>
  setTimeout(() => {
    fields.forEach(field => showError(field, ""));
    onCourseChange();
  }, 0)
);

// «Limpiar formulario» también oculta el mensaje anterior (el reinicio tras guardar no lo hace).
document.getElementById("reset-btn").addEventListener("click", hideMessage);

document.getElementById("records-list").addEventListener("click", event => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  const records = getRecords();
  const record = records[Number(button.dataset.index)];
  if (!record) return;
  if (confirm("¿Cancelar tu registro en " + record.course + "?")) {
    records.splice(Number(button.dataset.index), 1);
    saveRecords(records);
    renderRecords();
  }
});

document.getElementById("clear-records").addEventListener("click", () => {
  const total = getRecords().length;
  if (total && confirm("¿Borrar los " + total + " registros guardados en este navegador? Esta acción no se puede deshacer.")) {
    localStorage.removeItem(storageKey);
    renderRecords();
  }
});

/* ---------- Inicio ---------- */

onCourseChange();
renderRecords();
updateActiveLink();
