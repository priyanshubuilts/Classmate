const STORAGE_KEY = "notenest_student_workspace_v1";
const defaultData = { notes: [], assignments: [], projects: [] };
let data = loadData();
let editing = null;
let toastTimer;
const $ = (id) => document.getElementById(id);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const prettyDate = (date) => {
  if (!date) return "No date set";
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.notes) && Array.isArray(saved.assignments) && Array.isArray(saved.projects)) {
      saved.projects.forEach(project => { if (typeof project.progress !== "number") project.progress = 0; });
      return saved;
    }
  } catch (error) { console.warn("Could not load saved ClassMate data", error); }
  return { notes: [], assignments: [], projects: [] };
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); renderAll(); }
  catch (error) { showToast("Could not save. Check browser storage settings."); }
}
function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2500);
}
function emptyState(title, message) { return `<div class="empty-state"><strong>${title}</strong>${message}</div>`; }
function setView(view) {
  const labels = { dashboard: "Dashboard", notes: "Class Notes", assignments: "Assignments", projects: "Project Planner" };
  if (!labels[view]) return;
  $("pageCrumb").textContent = labels[view];
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("dashboardView").classList.toggle("hidden", view !== "dashboard");
  ["notes", "assignments", "projects"].forEach(name => $(name + "View").classList.toggle("hidden", view !== name));
  $("statsGrid").classList.toggle("hidden", view !== "dashboard");
  const headings = {
    dashboard: ["Make room for <span>great ideas.</span>", "Your notes, deadlines and project plans — all in one calm place."],
    notes: ["Your notes, <span>your way.</span>", "Store class notes and find them whenever you need them."],
    assignments: ["Deadlines, <span>under control.</span>", "See what is due and keep track of completed work."],
    projects: ["Big ideas, <span>small steps.</span>", "Plan your college projects one step at a time."]
  };
  $("pageTitle").innerHTML = headings[view][0];
  $("pageSubtitle").textContent = headings[view][1];
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderAll() {
  $("notesTotal").textContent = data.notes.length;
  $("upcomingTotal").textContent = data.assignments.filter(a => !a.done).length;
  $("projectsTotal").textContent = data.projects.filter(p => p.progress < 100).length;
  $("assignmentNavCount").textContent = data.assignments.filter(a => !a.done).length;
  renderRecentNotes(); renderUpcomingAssignments(); renderNotes(); renderAssignments(); renderProjects(); renderSubjectFilter();
}
function renderRecentNotes() {
  const notes = [...data.notes].sort((a,b) => (b.created || 0) - (a.created || 0)).slice(0, 3);
  $("recentNotes").innerHTML = notes.length ? notes.map(note => `
    <div class="note-row"><div class="row-icon">N</div><div class="row-copy"><strong>${escapeHTML(note.title)}</strong><small>${escapeHTML(note.subject || "General")} · ${prettyDate(note.date)}</small></div><button class="edit-button" data-edit="notes" data-id="${note.id}" aria-label="Edit note">Edit</button><button class="delete-button" data-delete="notes" data-id="${note.id}" aria-label="Delete note">×</button></div>`).join("") : emptyState("No notes yet", "Create your first class note to get started.");
}
function renderUpcomingAssignments() {
  const list = data.assignments.filter(a => !a.done).sort((a,b) => (a.due || "9999").localeCompare(b.due || "9999")).slice(0, 3);
  $("upcomingAssignments").innerHTML = list.length ? list.map(a => `
    <div class="assignment-row"><button class="check-button" data-toggle="${a.id}" aria-label="Mark assignment complete"></button><div class="row-icon orange-bg">A</div><div class="row-copy"><strong>${escapeHTML(a.title)}</strong><small>${escapeHTML(a.priority)} priority</small></div><span class="row-date">${prettyDate(a.due)}</span></div>`).join("") : emptyState("You're all caught up", "Add an assignment here to remember its due date.");
}
function renderNotes() {
  const query = ($("noteSearch").value || "").toLowerCase();
  const subject = $("noteSubjectFilter").value;
  const notes = [...data.notes].filter(n => (subject === "all" || n.subject === subject) && `${n.title} ${n.subject} ${n.body}`.toLowerCase().includes(query)).sort((a,b) => (b.created || 0) - (a.created || 0));
  $("allNotes").innerHTML = notes.length ? notes.map(n => `
    <article class="note-card"><div class="card-top"><span class="tag">${escapeHTML(n.subject || "General")}</span><div class="card-actions"><button class="edit-button" data-edit="notes" data-id="${n.id}" aria-label="Edit note">Edit</button><button class="delete-button" data-delete="notes" data-id="${n.id}" aria-label="Delete note">×</button></div></div><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body || "No note details added yet.")}</p><div class="card-foot"><span>Class note</span><span>${prettyDate(n.date)}</span></div></article>`).join("") : emptyState("No matching notes", data.notes.length ? "Try a different search or subject." : "Select “New note” to save your first class note.");
}
function renderSubjectFilter() {
  const select = $("noteSubjectFilter"), old = select.value;
  const subjects = [...new Set(data.notes.map(n => n.subject).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All subjects</option>' + subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
  select.value = subjects.includes(old) ? old : "all";
}
function renderAssignments() {
  const query = ($("assignmentSearch").value || "").toLowerCase(), status = $("assignmentStatusFilter").value;
  const list = [...data.assignments].filter(a => `${a.title} ${a.priority}`.toLowerCase().includes(query) && (status === "all" || (status === "done" ? a.done : !a.done))).sort((a,b) => (a.due || "9999").localeCompare(b.due || "9999"));
  $("allAssignments").innerHTML = list.length ? list.map(a => `
    <div class="assignment-row ${a.done ? "completed" : ""}"><button class="check-button ${a.done ? "checked" : ""}" data-toggle="${a.id}" aria-label="Toggle completed">${a.done ? "✓" : ""}</button><div class="row-icon orange-bg">A</div><div class="row-copy"><strong>${escapeHTML(a.title)}</strong><small>Due: ${prettyDate(a.due)}</small></div><span class="priority ${escapeHTML(a.priority)}">${escapeHTML(a.priority)}</span><button class="edit-button" data-edit="assignments" data-id="${a.id}" aria-label="Edit assignment">Edit</button><button class="delete-button" data-delete="assignments" data-id="${a.id}" aria-label="Delete assignment">×</button></div>`).join("") : emptyState("No assignments found", "Add an assignment to start tracking deadlines.");
}
function renderProjects() {
  const projects = [...data.projects].sort((a,b) => (b.created || 0) - (a.created || 0));
  $("allProjects").innerHTML = projects.length ? projects.map(p => `
    <article class="project-card"><div class="card-top"><span class="tag">${escapeHTML(p.subject || "College project")}</span><div class="card-actions"><button class="edit-button" data-edit="projects" data-id="${p.id}" aria-label="Edit project">Edit</button><button class="delete-button" data-delete="projects" data-id="${p.id}" aria-label="Delete project">×</button></div></div><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.body || "Add a plan or next steps when you're ready.")}</p><div class="progress-meta"><span>Progress</span><strong>${Number(p.progress || 0)}%</strong></div><div class="progress-track"><span style="width:${Math.min(100, Math.max(0, Number(p.progress) || 0))}%"></span></div><div class="card-foot"><span>Target date</span><span>${prettyDate(p.due)}</span></div></article>`).join("") : emptyState("Your next big idea starts here", "Create a project and write down the steps to complete it.");
}
function openEntry(type, id = null) {
  $("entryForm").reset(); editing = id ? { type, id } : null;
  const item = id ? data[type].find(entry => entry.id === id) : null;
  $("entryType").value = type;
  $("noteFields").classList.toggle("hidden", type !== "notes");
  $("assignmentFields").classList.toggle("hidden", type !== "assignments");
  $("projectFields").classList.toggle("hidden", type !== "projects");
  const labels = { notes: ["CREATE A CLASS NOTE", "Create a note"], assignments: ["KEEP TRACK OF A DEADLINE", "Add assignment"], projects: ["PLAN YOUR NEXT BIG IDEA", "New project"] };
  if (item) {
    labels[type][0] = "UPDATE YOUR WORKSPACE"; labels[type][1] = type === "notes" ? "Edit note" : type === "assignments" ? "Edit assignment" : "Edit project";
    $("entryTitle").value = item.title || "";
    if (type === "notes") { $("entrySubject").value = item.subject || ""; $("entryBody").value = item.body || ""; }
    if (type === "assignments") { $("entryDue").value = item.due || ""; $("entryPriority").value = item.priority || "Normal"; }
    if (type === "projects") { $("entryProjectSubject").value = item.subject || ""; $("entryProjectDue").value = item.due || ""; $("entryProjectBody").value = item.body || ""; $("entryProjectProgress").value = String(item.progress || 0); }
  } else if (type === "projects") $("entryProjectProgress").value = "0";
  $("dialogEyebrow").textContent = labels[type][0]; $("dialogTitle").textContent = labels[type][1];
  $("entryDialog").showModal(); $("entryTitle").focus();
}
function closeEntry() { $("entryDialog").close(); editing = null; }
$("entryForm").addEventListener("submit", event => {
  event.preventDefault();
  const type = $("entryType").value, title = $("entryTitle").value.trim();
  if (!title) return;
  const wasEditing = Boolean(editing);
  const now = Date.now();
  let item = editing ? data[editing.type].find(entry => entry.id === editing.id) : null;
  if (!item) { item = { id: (crypto.randomUUID ? crypto.randomUUID() : String(now + Math.random())), created: now }; data[type].push(item); }
  item.title = title;
  if (type === "notes") Object.assign(item, { subject: $("entrySubject").value.trim(), body: $("entryBody").value.trim(), date: new Date().toISOString().slice(0,10) });
  if (type === "assignments") Object.assign(item, { due: $("entryDue").value, priority: $("entryPriority").value, done: item.done || false });
  if (type === "projects") Object.assign(item, { subject: $("entryProjectSubject").value.trim(), due: $("entryProjectDue").value, body: $("entryProjectBody").value.trim(), progress: Number($("entryProjectProgress").value) });
  closeEntry(); saveData(); showToast(wasEditing ? "Item updated!" : type === "notes" ? "Class note saved!" : type === "assignments" ? "Assignment added!" : "Project added!");
});
document.addEventListener("click", event => {
  const nav = event.target.closest("[data-view]"); if (nav) setView(nav.dataset.view);
  const go = event.target.closest("[data-go]"); if (go) setView(go.dataset.go);
  const add = event.target.closest("[data-action]"); if (add) openEntry(add.dataset.action.replace("new-", "") + "s");
  const edit = event.target.closest("[data-edit]"); if (edit) openEntry(edit.dataset.edit, edit.dataset.id);
  const del = event.target.closest("[data-delete]");
  if (del) { const type = del.dataset.delete; if (confirm("Delete this item? This cannot be undone.")) { data[type] = data[type].filter(item => item.id !== del.dataset.id); saveData(); showToast("Item deleted."); } }
  const toggle = event.target.closest("[data-toggle]");
  if (toggle) { const item = data.assignments.find(a => a.id === toggle.dataset.toggle); if (item) { item.done = !item.done; saveData(); showToast(item.done ? "Assignment marked complete." : "Assignment marked pending."); } }
});
$("noteSearch").addEventListener("input", renderNotes);
$("noteSubjectFilter").addEventListener("change", renderNotes);
$("assignmentSearch").addEventListener("input", renderAssignments);
$("assignmentStatusFilter").addEventListener("change", renderAssignments);
$("closeDialog").addEventListener("click", closeEntry);
$("cancelDialog").addEventListener("click", closeEntry);
$("exportNotes").addEventListener("click", () => {
  if (!data.notes.length) { showToast("Add a note before exporting."); return; }
  const content = data.notes.map(n => `${n.title}\nSubject: ${n.subject || "General"}\nDate: ${prettyDate(n.date)}\n\n${n.body || ""}\n\n${"-".repeat(40)}\n`).join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = "classmate-class-notes.txt"; link.click(); URL.revokeObjectURL(url); showToast("Notes exported as a text file.");
});
$("todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
renderAll();
