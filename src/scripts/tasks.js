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
    try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        
        const lists = {
            'TODO': document.querySelector('#col-todo .task-list'),
            'IN_PROGRESS': document.querySelector('#col-progress .task-list'),
            'DONE': document.querySelector('#col-done .task-list')
        };
        
        // очищаем список чтобы при отрисовывании задачи не дублировались (именно в list.innerHTML = "" - типа всё что внутри элемента очсищаем) 
        Object.values(lists).forEach(list => list.innerHTML = "");

        tasks.forEach(t => {
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
                        <button onclick="updateTaskStatus(${t.id}, 'DONE')">Готово</button>
                    `;
                } else if (status === 'DONE') {
                    buttonsHtml = `<button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">Вернуть в работу</button>`;
                }

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
                        ${buttonsHtml}
                        <button class="btn-delete" onclick="if(confirm('Удалить задачу?')) deleteTask(${t.id})">Удалить</button>
                    </div>
                `;
                targetList.appendChild(li);
            }
        });
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

// Обработка формы
document.getElementById('taskForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const titleInput = document.getElementById('taskTitle');
    const priorityInput = document.getElementById('taskPriority');
    const messageSpan = document.getElementById('message');
    const title = titleInput.value;
    const priority = priorityInput.value;

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            // отправляем объект по ТЗ: title и project_id
            body: JSON.stringify({ title: title, project_id: 1, priority: priority })
        });

        if (response.ok) {
            titleInput.value = ""; // очищаем поле
            messageSpan.style.color = "green";
            messageSpan.textContent = "Задача добавлена!";
            loadTasks(); // перезагружаем список, чтобы увидеть новую задачу
        } else {
            messageSpan.style.color = "red";
            messageSpan.textContent = "Ошибка при сохранении";
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const todoList = document.querySelector('#col-todo .task-list');
    const progressList = document.querySelector('#col-progress .task-list');
    const doneList = document.querySelector('#col-done .task-list');

    const options = {
        group: 'shared',
        animation: 150,
        onEnd: function (evt) {
            const taskId = evt.item.dataset.taskId;
            
            // если перемещение внутри одной колонки
            if (evt.from === evt.to) {
                const taskIds = Array.from(evt.to.children).map(item => item.dataset.taskId);
                
                fetch('/api/tasks/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: taskIds })
                }).catch(err => console.error("Ошибка при обновлении порядка:", err));

            } else { // если задача перенесена в другую колонку
                let newStatus;
                const parentId = evt.to.parentElement.id;
                switch (parentId) {
                    case 'col-todo':
                        newStatus = 'TODO';
                        break;
                    case 'col-progress':
                        newStatus = 'IN_PROGRESS';
                        break;
                    case 'col-done':
                        newStatus = 'DONE';
                        break;
                }

                if (newStatus) {
                    updateTaskStatus(taskId, newStatus);
                }
            }
        }
    };

    new Sortable(todoList, options);
    new Sortable(progressList, options);
    new Sortable(doneList, options);
});