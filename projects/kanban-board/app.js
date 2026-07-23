const dialog = document.getElementById('task-dialog');
const form = document.getElementById('task-form');
const addTaskBtn = document.getElementById('add-task-btn');
const dropzones = Array.from(document.querySelectorAll('.dropzone'));

let tasks = JSON.parse(localStorage.getItem('kanban-tasks') || '[]');

function renderTasks() {
  dropzones.forEach((zone) => {
    zone.innerHTML = '';
  });

  tasks.forEach((task) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.draggable = true;
    card.textContent = task.title;
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    document.getElementById(task.status).appendChild(card);
  });
}

function saveTasks() {
  localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
}

addTaskBtn.addEventListener('click', () => {
  dialog.showModal();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const status = document.getElementById('task-status').value;
  if (!title) return;
  tasks.push({ id: crypto.randomUUID(), title, status });
  saveTasks();
  renderTasks();
  form.reset();
  dialog.close();
});

dropzones.forEach((zone) => {
  zone.addEventListener('dragover', (event) => event.preventDefault());
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    const title = event.dataTransfer.getData('text/plain');
    const task = tasks.find((item) => item.title === title);
    if (task) {
      task.status = zone.id;
      saveTasks();
      renderTasks();
    }
  });
});

renderTasks();
