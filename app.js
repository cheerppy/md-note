const STORAGE_KEY = "md-note-v0";

const elements = {
  newNoteButton: document.getElementById("new-note"),
  searchInput: document.getElementById("search-input"),
  noteList: document.getElementById("note-list"),
  noteCount: document.getElementById("note-count"),
  emptyState: document.getElementById("empty-state"),
  noteView: document.getElementById("note-view"),
  noteEditor: document.getElementById("note-editor"),
  viewTitle: document.getElementById("view-title"),
  viewUpdated: document.getElementById("view-updated"),
  viewBody: document.getElementById("view-body"),
  editNoteButton: document.getElementById("edit-note"),
  editTitle: document.getElementById("edit-title"),
  editBody: document.getElementById("edit-body"),
  cancelEditButton: document.getElementById("cancel-edit"),
};

const state = {
  notes: [],
  selectedId: null,
  searchTerm: "",
  isEditing: false,
};

const generateId = () => crypto.randomUUID();

const loadNotes = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse stored notes", error);
    return [];
  }
};

const saveNotes = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFilteredNotes = () => {
  if (!state.searchTerm) {
    return state.notes;
  }
  const keyword = state.searchTerm.toLowerCase();
  return state.notes.filter((note) =>
    `${note.title}\n${note.body}`.toLowerCase().includes(keyword)
  );
};

const setSelected = (id) => {
  state.selectedId = id;
  state.isEditing = false;
  render();
};

const startEditing = (note) => {
  state.isEditing = true;
  if (note) {
    elements.editTitle.value = note.title;
    elements.editBody.value = note.body;
  } else {
    elements.editTitle.value = "";
    elements.editBody.value = "";
  }
  render();
};

const deleteNote = (id) => {
  state.notes = state.notes.filter((note) => note.id !== id);
  if (state.selectedId === id) {
    state.selectedId = state.notes[0]?.id ?? null;
  }
  saveNotes();
  render();
};

const upsertNote = ({ id, title, body }) => {
  const now = Date.now();
  const existing = state.notes.find((note) => note.id === id);
  if (existing) {
    existing.title = title;
    existing.body = body;
    existing.updatedAt = now;
  } else {
    state.notes.unshift({
      id,
      title,
      body,
      updatedAt: now,
    });
  }
  state.selectedId = id;
  saveNotes();
};

const renderList = () => {
  const filtered = getFilteredNotes();
  elements.noteCount.textContent = filtered.length;
  elements.noteList.innerHTML = "";

  filtered.forEach((note) => {
    const item = document.createElement("li");
    item.className = "note-list__item";
    if (note.id === state.selectedId) {
      item.classList.add("is-active");
    }

    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `
      <span class="note-title">${note.title}</span>
      <span class="note-meta">${formatDate(note.updatedAt)}</span>
    `;
    button.addEventListener("click", () => setSelected(note.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon";
    deleteButton.title = "削除";
    deleteButton.textContent = "🗑";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const confirmDelete = window.confirm("このメモを削除しますか？");
      if (confirmDelete) {
        deleteNote(note.id);
      }
    });

    item.appendChild(button);
    item.appendChild(deleteButton);
    elements.noteList.appendChild(item);
  });
};

const renderView = () => {
  const selected = state.notes.find((note) => note.id === state.selectedId);
  const hasNotes = state.notes.length > 0;

  elements.emptyState.classList.toggle("hidden", hasNotes);
  elements.noteView.classList.toggle("hidden", !selected || state.isEditing);
  elements.noteEditor.classList.toggle("hidden", !state.isEditing);

  if (selected && !state.isEditing) {
    elements.viewTitle.textContent = selected.title;
    elements.viewUpdated.textContent = `最終更新: ${formatDate(selected.updatedAt)}`;
    elements.viewBody.innerHTML = marked.parse(selected.body, {
      breaks: true,
      gfm: true,
    });
  }

  if (state.isEditing) {
    elements.editTitle.focus();
  }
};

const render = () => {
  renderList();
  renderView();
};

const init = () => {
  state.notes = loadNotes();
  state.notes.sort((a, b) => b.updatedAt - a.updatedAt);
  state.selectedId = state.notes[0]?.id ?? null;
  render();
};

elements.newNoteButton.addEventListener("click", () => {
  const id = generateId();
  state.selectedId = id;
  startEditing();
});

elements.editNoteButton.addEventListener("click", () => {
  const note = state.notes.find((item) => item.id === state.selectedId);
  if (note) {
    startEditing(note);
  }
});

elements.cancelEditButton.addEventListener("click", () => {
  state.isEditing = false;
  render();
});

elements.noteEditor.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.editTitle.value.trim();
  const body = elements.editBody.value.trim();
  if (!title || !body) {
    return;
  }
  upsertNote({
    id: state.selectedId ?? generateId(),
    title,
    body,
  });
  state.isEditing = false;
  render();
});

elements.searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value.trim();
  renderList();
});

init();
