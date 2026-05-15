// Функция для смены статуса
async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadTasks(); // перерисовываем доску
        }
    } catch (err) {
        console.error("Ошибка при смене статуса:", err);
    }
}

async function updateTaskPriority(taskId, priority) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/priority`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: priority })
        });

        if (response.ok) {
            loadTasks();
        }
    } catch (err) {
        console.error("Ошибка при смене приоритета:", err);
    }
}

async function loadTasks() {
    const projectId = localStorage.getItem('currentProjectId') || 1;
    if (!projectId) {
        console.log("Проект не выбран");
        // Можно скрыть доску или написать "Выберите проект"
        return; 
    }
    try {
        const res = await fetch(`/api/tasks?projectId=${projectId}`);
        const tasks = await res.json();
        
        const lists = {
            'TODO': document.querySelector('#col-todo .task-list'),
            'IN_PROGRESS': document.querySelector('#col-progress .task-list'),
            'TESTING': document.querySelector('#col-testing .task-list'),
            'DONE': document.querySelector('#col-done .task-list')
        };
        
        Object.values(lists).forEach(list => list.innerHTML = "");

        tasks.forEach(t => {
            console.log("Загружаю задачу:", t);
            const status = t.status || 'TODO';
            const targetList = lists[status];

            if (targetList) {
                const li = document.createElement('li');
                li.className = `task-card priority-${t.priority}`;
                li.dataset.taskId = t.id;
                
                // Генерируем кнопки в зависимости от статуса
                let buttonsHtml = '';
                if (status === 'TODO') {
                    buttonsHtml = `<button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">В работу</button>`;
                } else if (status === 'IN_PROGRESS') {
                    buttonsHtml = `
                        <button onclick="updateTaskStatus(${t.id}, 'TODO')">Назад</button>
                        <button onclick="updateTaskStatus(${t.id}, 'TESTING')">Тестировать</button>
                    `;
                } else if (status === 'TESTING') {
                    buttonsHtml = `
                        <button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">Назад</button>
                        <button onclick="updateTaskStatus(${t.id}, 'DONE')">Готово</button>
                    `;
                } else if (status === 'DONE') {
                    buttonsHtml = `<button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">Вернуть в работу</button>`;
                }

                const priorities = ['Высокий', 'Средний', 'Низкий'];
                const safeTitle = t.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const priorityDropdown = `
                    <select onchange="updateTaskPriority(${t.id}, this.value)">
                        ${priorities.map(p => `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                `;

                li.innerHTML = `
                    <div class="task-content">
                        <strong>${t.title} <span class="edit-icon" onclick="openRenameDialog(${t.id}, 'task', '${safeTitle}')" title="Переименовать задачу">&#9998;</span></strong>
                        <p>Приоритет: ${priorityDropdown}</p>
                    </div>
                    <div class="task-actions">
                        ${buttonsHtml}
                        <button class="btn-delete" onclick="if(confirm('Удалить задачу?')) deleteTask(${t.id})">Удалить</button>
                    </div>
                `;
                targetList.appendChild(li);
            }
        });
        initSortable();
        applyPermissions();
    } catch (err) {
        console.error("Ошибка загрузки задач:", err);
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadTasks(); // Перезагружаем список для отображения изменений
        } else {
            const errorData = await response.json();
            console.error('Ошибка при удалении задачи:', errorData.error);
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
    }
}

// Загружаем при старте страницы
loadTasks();

function initSortable() {
    const lists = document.querySelectorAll('.task-list');
    const role = localStorage.getItem('userRole'); // Получаем роль

    lists.forEach(list => {
        if(list.sortableInstance) list.sortableInstance.destroy();
        
        list.sortableInstance = new Sortable(list, {
            group: 'shared',
            animation: 150,
            onEnd: function (evt) {
                const taskId = evt.item.dataset.taskId;
                const parentId = evt.to.parentElement.id;
                const role = localStorage.getItem('userRole');
                
                let newStatus = '';
                if (parentId === 'col-todo') newStatus = 'TODO';
                else if (parentId === 'col-progress') newStatus = 'IN_PROGRESS';
                else if (parentId === 'col-testing') newStatus = 'TESTING';
                else if (parentId === 'col-done') newStatus = 'DONE';

                if (role === 'DEVELOPER' && newStatus === 'DONE') {
                    alert("Разработчик не может переводить задачи в 'Готово'. Это должен сделать Тестировщик.");
                    loadTasks(); // Сбрасываем карточку на старое место (перерисовываем доску)
                    return; 
                }

                if (role === 'TESTER' && newStatus === 'TODO') {
                    alert("Тестировщик не может возвращать задачи в начало (Нужно сделать)");
                    loadTasks(); return;
                }

                if (evt.from !== evt.to) {
                    updateTaskStatus(taskId, newStatus);
                }
            }
        });
    });
}

document.getElementById('taskForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    // Берем ID текущего проекта из localStorage
    const currentProjectId = localStorage.getItem('currentProjectId') || 1;

    const titleInput = document.getElementById('taskTitle');
    const priorityInput = document.getElementById('taskPriority');
    const messageSpan = document.getElementById('message');
    
    const title = titleInput.value;
    const priority = priorityInput.value;

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                title: title, 
                project_id: currentProjectId,
                priority: priority 
            })
        });

        if (response.ok) {
            titleInput.value = ""; 
            messageSpan.style.color = "green";
            messageSpan.textContent = "Задача добавлена!";
            loadTasks(); // Перезагружаем список
        } else {
            messageSpan.style.color = "red";
            messageSpan.textContent = "Ошибка при сохранении";
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
    }
});

function applyPermissions() {
    const role = localStorage.getItem('userRole');
    
    if (role === 'DEVELOPER' || role === 'TESTER') {
        const taskForm = document.getElementById('taskForm');
        if (taskForm) taskForm.style.display = 'none';
        document.querySelectorAll('.btn-delete').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.edit-icon').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.task-content select').forEach(sel => sel.disabled = true);
    }

    if (role === 'TESTER') {
        // ТЕСТЕРУ нельзя нажимать кнопку "Назад" в ПЕРВЫЙ столбец (TODO)
        document.querySelectorAll('button[onclick*="\'TODO\'"]').forEach(btn => btn.style.display = 'none');
    }

    if (role === 'DEVELOPER') {
        // РАЗРАБОТЧИКУ нельзя нажимать кнопку "Готово" (DONE)
        document.querySelectorAll('button[onclick*="\'DONE\'"]').forEach(btn => btn.style.display = 'none');
    }
}