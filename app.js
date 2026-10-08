const API_BASE = "https://jsonplaceholder.typicode.com";
const PAGE_SIZE = 9;

const state = {
  posts: [],
  users: [],
  comments: [],
  page: 1,
  search: "",
  authorId: "",
  deferredInstall: null,
  toastTimer: null,
  readFromOfflineCache: false
};

const elements = {
  grid: document.querySelector("#post-grid"),
  search: document.querySelector("#search-input"),
  authorFilter: document.querySelector("#author-filter"),
  pagination: document.querySelector("#pagination"),
  resultsCount: document.querySelector("#results-count"),
  emptyState: document.querySelector("#empty-state"),
  errorState: document.querySelector("#error-state"),
  connectionNote: document.querySelector("#connection-note"),
  postDialog: document.querySelector("#post-dialog"),
  detailDialog: document.querySelector("#detail-dialog"),
  detailContent: document.querySelector("#detail-content"),
  createForm: document.querySelector("#create-form"),
  authorSelect: document.querySelector("#post-author"),
  formError: document.querySelector("#form-error"),
  submitPost: document.querySelector("#submit-post"),
  toast: document.querySelector("#toast"),
  installButton: document.querySelector("#install-button")
};

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getAuthor(userId) {
  return state.users.find((user) => user.id === userId);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`La API respondió con el estado ${response.status}.`);
  }
  if (response.headers.get("X-Cuaderno-Offline") === "true") {
    state.readFromOfflineCache = true;
  }
  return response.json();
}

async function loadLibrary() {
  state.readFromOfflineCache = false;
  elements.grid.setAttribute("aria-busy", "true");
  elements.errorState.hidden = true;
  elements.emptyState.hidden = true;
  elements.connectionNote.hidden = true;
  elements.resultsCount.textContent = "Cargando historias...";
  elements.pagination.replaceChildren();

  try {
    const [posts, users, comments] = await Promise.all([
      requestJson("/posts"),
      requestJson("/users"),
      requestJson("/comments")
    ]);

    state.posts = posts;
    state.users = users;
    state.comments = comments;
    elements.connectionNote.hidden = !state.readFromOfflineCache;
    populateAuthors();
    document.querySelector("#stat-posts").textContent = String(posts.length);
    document.querySelector("#stat-authors").textContent = String(users.length);
    document.querySelector("#stat-comments").textContent = String(comments.length);
    renderPosts();
  } catch (error) {
    elements.grid.replaceChildren();
    elements.resultsCount.textContent = "No fue posible conectar con la biblioteca.";
    elements.errorState.hidden = false;
    elements.connectionNote.hidden = navigator.onLine && !state.readFromOfflineCache;
    console.error("Error al cargar JSONPlaceholder:", error);
  } finally {
    elements.grid.setAttribute("aria-busy", "false");
  }
}

function populateAuthors() {
  const sortedUsers = [...state.users].sort((first, second) => first.name.localeCompare(second.name, "es"));
  const authorOptions = sortedUsers.map((user) =>
    `<option value="${user.id}">${escapeText(user.name)}</option>`
  ).join("");
  elements.authorFilter.innerHTML = `<option value="">Todos los autores</option>${authorOptions}`;
  elements.authorSelect.innerHTML = authorOptions;
  elements.authorFilter.value = state.authorId;
}

function getFilteredPosts() {
  const query = state.search.trim().toLocaleLowerCase("es");
  return state.posts.filter((post) => {
    const author = getAuthor(post.userId);
    const matchesAuthor = !state.authorId || String(post.userId) === state.authorId;
    const searchText = `${post.title} ${post.body} ${author?.name ?? ""}`.toLocaleLowerCase("es");
    return matchesAuthor && (!query || searchText.includes(query));
  });
}

function renderPosts() {
  const filteredPosts = getFilteredPosts();
  const pageCount = Math.ceil(filteredPosts.length / PAGE_SIZE);
  if (state.page > Math.max(pageCount, 1)) state.page = Math.max(pageCount, 1);

  const startIndex = (state.page - 1) * PAGE_SIZE;
  const pagePosts = filteredPosts.slice(startIndex, startIndex + PAGE_SIZE);
  elements.grid.replaceChildren(...pagePosts.map(createPostCard));
  elements.emptyState.hidden = filteredPosts.length !== 0;
  elements.resultsCount.textContent = filteredPosts.length
    ? `Mostrando ${startIndex + 1}–${Math.min(startIndex + pagePosts.length, filteredPosts.length)} de ${filteredPosts.length} historias`
    : "No hay historias para mostrar.";
  renderPagination(pageCount);
}

function createPostCard(post) {
  const author = getAuthor(post.userId);
  const authorName = author?.name ?? "Autor invitado";
  const commentCount = state.comments.filter((comment) => comment.postId === post.id).length;
  const card = document.createElement("article");
  card.className = "post-card";
  card.innerHTML = `
    <div class="post-card-top">
      <span class="post-category">${escapeText(author?.company?.bs ?? "una idea")}</span>
      <span class="post-number">N.º ${String(post.id).padStart(2, "0")}</span>
    </div>
    <h3 class="post-title">${escapeText(post.title)}</h3>
    <p class="post-excerpt">${escapeText(post.body)}</p>
    <div class="post-card-bottom">
      <div class="author">
        <span class="avatar" aria-hidden="true">${escapeText(authorName.charAt(0))}</span>
        <span class="author-name">${escapeText(authorName)}</span>
      </div>
      <button class="post-open" type="button" data-post-id="${post.id}" aria-label="Leer ${escapeText(post.title)} y sus ${commentCount} comentarios">${commentCount} comentarios ↗</button>
    </div>
  `;
  return card;
}

function renderPagination(pageCount) {
  elements.pagination.replaceChildren();
  if (pageCount <= 1) return;

  const previous = createPageButton("←", state.page - 1, "Página anterior");
  previous.disabled = state.page === 1;
  elements.pagination.append(previous);

  for (let page = 1; page <= pageCount; page += 1) {
    const button = createPageButton(String(page), page, `Página ${page}`);
    if (page === state.page) button.setAttribute("aria-current", "page");
    elements.pagination.append(button);
  }

  const next = createPageButton("→", state.page + 1, "Página siguiente");
  next.disabled = state.page === pageCount;
  elements.pagination.append(next);
}

function createPageButton(label, page, accessibleName) {
  const button = document.createElement("button");
  button.className = "page-link";
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", accessibleName);
  button.addEventListener("click", () => {
    state.page = page;
    renderPosts();
    document.querySelector("#library-title").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return button;
}

function openPost(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;

  const author = getAuthor(post.userId);
  const comments = state.comments.filter((comment) => comment.postId === post.id);
  elements.detailContent.innerHTML = `
    <p class="detail-category">${escapeText(author?.company?.bs ?? "Una idea para explorar")}</p>
    <h2 class="detail-title" id="detail-title">${escapeText(post.title)}</h2>
    <p class="detail-byline">Una historia de ${escapeText(author?.name ?? "Autor invitado")}</p>
    <p class="detail-body">${escapeText(post.body)}</p>
    <div class="comments-heading"><h3>Conversación</h3><span>${comments.length} comentarios</span></div>
    ${comments.length ? comments.map((comment) => `
      <article class="comment">
        <div class="comment-header"><p class="comment-name">${escapeText(comment.name)}</p><span class="comment-email">${escapeText(comment.email)}</span></div>
        <p class="comment-body">${escapeText(comment.body)}</p>
      </article>
    `).join("") : '<p class="comment-body">Aún no hay comentarios para esta historia.</p>'}
  `;
  elements.detailDialog.showModal();
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3500);
}

async function submitPost(event) {
  event.preventDefault();
  elements.formError.hidden = true;
  elements.submitPost.disabled = true;
  elements.submitPost.textContent = "Compartiendo...";

  const formData = new FormData(elements.createForm);
  const draft = {
    title: String(formData.get("title")).trim(),
    body: String(formData.get("body")).trim(),
    userId: Number(formData.get("userId"))
  };

  try {
    const createdPost = await requestJson("/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(draft)
    });
    state.posts.unshift({ ...draft, ...createdPost });
    state.page = 1;
    state.search = "";
    state.authorId = "";
    elements.search.value = "";
    elements.authorFilter.value = "";
    elements.createForm.reset();
    elements.postDialog.close();
    renderPosts();
    showToast("Tu historia está lista. Recuerda: la API de prueba no la guarda permanentemente.");
  } catch (error) {
    elements.formError.textContent = `No se pudo compartir la historia. ${error.message}`;
    elements.formError.hidden = false;
    console.error("Error al crear la publicación:", error);
  } finally {
    elements.submitPost.disabled = false;
    elements.submitPost.innerHTML = 'Compartir historia <span aria-hidden="true">↗</span>';
  }
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstall = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    elements.installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    elements.installButton.hidden = true;
    showToast("Cuaderno ya está instalado en tu dispositivo.");
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
      });
    }
  } catch (error) {
    console.error("No se pudo activar el modo sin conexión:", error);
    showToast("La app funciona, pero no se pudo activar el modo sin conexión.");
  }
}

elements.search.addEventListener("input", () => {
  state.search = elements.search.value;
  state.page = 1;
  renderPosts();
});

elements.authorFilter.addEventListener("change", () => {
  state.authorId = elements.authorFilter.value;
  state.page = 1;
  renderPosts();
});

elements.grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-post-id]");
  if (button) openPost(Number(button.dataset.postId));
});

document.querySelector("#open-create").addEventListener("click", () => elements.postDialog.showModal());
document.querySelector("#refresh-button").addEventListener("click", loadLibrary);
document.querySelector("#retry-button").addEventListener("click", loadLibrary);
elements.createForm.addEventListener("submit", submitPost);
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
document.querySelectorAll(".dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());
setupInstallPrompt();
registerServiceWorker().then(loadLibrary);
