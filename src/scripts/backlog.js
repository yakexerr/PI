const dialog = document.getElementById('myDialog');
const backlogFormDialog = document.getElementById('backlogFormDialog');

document.getElementById('btn-create').onclick = () => dialog.showModal();

backlogFormDialog.onsubmit = (e) => {
    e.preventDefault();

    const input = document.getElementById('backlogNameInput');
    const descriptionInput = document.getElementById('backlogDescriptInput');
    const priorityInput = document.getElementById('taskPriority');
    
    const backlogName = input.value.trim();
    const description = descriptionInput.value.trim();
    const priority = priorityInput.value;

    if(backlogName) {
        createBacklog(backlogName, description, priority);
        
        input.value = '';
        descriptionInput.value = '';
        priorityInput.value = 'Средний'; 
        
        dialog.close();
    }
}

// Диалоги для спринтов
const sprintDialog = document.getElementById('sprintDialog');
const sprintFormDialog = document.getElementById('sprintFormDialog');
const startSprintDialog = document.getElementById('startSprintDialog');
const startSprintFormDialog = document.getElementById('startSprintFormDialog');
const completeSprintDialog = document.getElementById('completeSprintDialog');
const completeSprintFormDialog = document.getElementById('completeSprintFormDialog');

sprintFormDialog.onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('sprintNameInput');
    const name = input.value.trim();
    if (!name) return;

    try {
        const res = await fetch('/api/sprints', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name, project_id: 1 })
        });
        if (res.ok) {
            input.value = '';
            sprintDialog.close();
            loadBacklog(); // Обновляем всё
        } else {
            console.error("Ошибка при создании спринта");
        }
    } catch(err) {
        console.error("Ошибка:", err);
    }
};

startSprintFormDialog.onsubmit = async (e) => {
    e.preventDefault();
    const sprintId = document.getElementById('startSprintId').value;
    try {
        const res = await fetch(`/api/sprints/${sprintId}/status`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: 'ACTIVE' })
        });
        if (res.ok) {
            startSprintDialog.close();
            loadBacklog();
        }
    } catch(err) {
        console.error("Ошибка:", err);
    }
};

completeSprintFormDialog.onsubmit = async (e) => {
    e.preventDefault();
    const sprintId = document.getElementById('completeSprintId').value;
    try {
        const res = await fetch(`/api/sprints/${sprintId}/status`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: 'COMPLETED' })
        });
        if (res.ok) {
            completeSprintDialog.close();
            loadBacklog();
        }
    } catch(err) {
        console.error("Ошибка:", err);
    }
};

function createNewSprint() {
    document.getElementById('sprintNameInput').value = '';
    sprintDialog.showModal();
}

function startSprint(sprintId) {
    document.getElementById('startSprintId').value = sprintId;
    startSprintDialog.showModal();
}

function completeSprint(sprintId) {
    document.getElementById('completeSprintId').value = sprintId;
    completeSprintDialog.showModal();
}


async function createBacklog(name, description, priority) {
    const messageSpan = document.getElementById('message');
    try {
        const response = await fetch('/api/backlogs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                title: name,
                description: description, 
                project_id: 1, 
                priority: priority,
                status: 'TODO'
            })
        });

        if (response.ok) {
            messageSpan.style.color = "green";
            messageSpan.textContent = "Беклог успешно создан!";
            loadBacklog(); 
            
            setTimeout(() => {
                messageSpan.textContent = '';
            }, 3000);
        } else {
            const errorData = await response.json();
            messageSpan.style.color = "red";
            messageSpan.textContent = errorData.error || "Ошибка при сохранении";
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
        messageSpan.style.color = "red";
        messageSpan.textContent = "Ошибка сети при создании беклога";
    }
}

function createTaskElement(t) {
    const li = document.createElement('li');
    li.className = `task-card priority-${t.priority}`;
    li.dataset.taskId = t.id;
    
    const priorities = ['Высокий', 'Средний', 'Низкий'];
    const priorityDropdown = `
        <select onchange="updateTaskPriority(${t.id}, this.value)">
            ${priorities.map(p => `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
    `;

    li.innerHTML = `
        <div class="task-content">
            <strong>${t.title}</strong>
            <p>Приоритет: ${priorityDropdown}</p>
        </div>
        <div class="task-actions">
            <button type="button" class="btn-delete" onclick="if(confirm('Удалить задачу?')) deleteBacklog(${t.id})">Удалить</button>
        </div>
    `;
    return li;
}

async function loadBacklog() {
    try {
        // Получаем все задачи
        const resTasks = await fetch('/api/backlogs');
        const tasks = await resTasks.json();

        // Получаем все спринты
        const resSprints = await fetch('/api/sprints');
        let sprints = [];
        if (resSprints.ok) {
            sprints = await resSprints.json();
        }

        // Вычисляем, какие задачи уже в спринтах
        const tasksInSprints = new Set();
        sprints.forEach(s => {
            if (s.tasks) {
                s.tasks.forEach(t => tasksInSprints.add(t.id));
            }
        });

        // Задачи для бэклога
        const backlogTasks = tasks.filter(t => !tasksInSprints.has(t.id));

        // Отрисовка спринтов
        const sprintsContainer = document.getElementById('sprintsContainer');
        sprintsContainer.innerHTML = '';
        
        sprints.forEach(sprint => {
            if (sprint.status === 'COMPLETED') return; // Можно скрывать или показывать по-другому

            const div = document.createElement('div');
            div.className = 'sprint-block';
            div.style.border = '1px solid #ccc';
            div.style.padding = '10px';
            div.style.marginBottom = '15px';
            div.style.borderRadius = '5px';
            div.style.background = sprint.status === 'ACTIVE' ? '#eef7ea' : '#f9f9f9';

            let statusText = sprint.status === 'ACTIVE' ? '(Активен)' : '(Запланирован)';
            
            let btnAction = '';
            if (sprint.status === 'TODO') {
                btnAction = `<button type="button" onclick="startSprint(${sprint.id})">Начать спринт</button>`;
            } else if (sprint.status === 'ACTIVE') {
                btnAction = `<button type="button" onclick="completeSprint(${sprint.id})">Завершить спринт</button>`;
            }

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3>${sprint.name} ${statusText}</h3>
                    ${btnAction}
                </div>
                <ul class="bl-list sprint-task-list" data-sprint-id="${sprint.id}" style="min-height: 50px; background: #fff; padding: 10px; border: 1px dashed #ccc;">
                </ul>
            `;
            
            const ul = div.querySelector('ul');
            if (sprint.tasks) {
                sprint.tasks.forEach(t => {
                    ul.appendChild(createTaskElement(t));
                });
            }
            
            sprintsContainer.appendChild(div);
        });

        // Отрисовка бэклога
        const location = document.querySelector('#blShow .bl-list');
        location.innerHTML = "";
        location.dataset.sprintId = "null"; // Помечаем, что это общий бэклог

        backlogTasks.forEach(t => {
            location.appendChild(createTaskElement(t));
        });

        initSortable();
    } catch (err) {
        console.error("Ошибка загрузки задач:", err);
    }
}

async function updateTaskPriority(taskId, priority) {
    try {
        const response = await fetch(`/api/backlogs/${taskId}/priority`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: priority })
        });
        if (response.ok) loadBacklog();
    } catch (err) {
        console.error("Ошибка при смене приоритета:", err);
    }
}

function initSortable() {
    // Инициализируем Sortable.js для бэклога и всех спринтов
    const lists = document.querySelectorAll('.bl-list');
    lists.forEach(list => {
        // Проверяем, не инициализирован ли он уже
        if(list.sortableInstance) list.sortableInstance.destroy();

        list.sortableInstance = new Sortable(list, {
            group: 'shared',
            animation: 150,
            onEnd: async function (evt) {
                const taskId = evt.item.dataset.taskId;
                const toSprintId = evt.to.dataset.sprintId;
                const fromSprintId = evt.from.dataset.sprintId;
                
                // Переместили из одной колонки в другую
                if (fromSprintId !== toSprintId) {
                    try {
                        if (toSprintId === "null") {
                            // Убрали из спринта в бэклог
                            await fetch(`/api/sprints/tasks/${taskId}`, { method: 'DELETE' });
                        } else {
                            // Добавили в спринт
                            await fetch(`/api/sprints/${toSprintId}/tasks`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ task_id: taskId })
                            });
                        }
                    } catch (err) {
                        console.error('Ошибка при перемещении задачи', err);
                        loadBacklog(); // откатываем при ошибке
                    }
                }
            }
        });
    });
}

async function deleteBacklog(taskId) {
    try {
        // Сначала пытаемся удалить из спринтов, хотя CASCADE или отдельный вызов удалит
        await fetch(`/api/sprints/tasks/${taskId}`, { method: 'DELETE' });

        const response = await fetch(`/api/backlogs/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadBacklog(); 
        } else {
            const errorData = await response.json();
            console.error('Ошибка при удалении задачи:', errorData.error);
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
    }
}

loadBacklog();