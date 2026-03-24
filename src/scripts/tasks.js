// Функция загрузки списка
async function loadTasks() {
    try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        const list = document.getElementById('taskList');
        
        // Отрисовываем список
        list.innerHTML = tasks.map(t => {
            const status = t.status || 'TODO';
            let buttons = '';

            if (status === 'TODO') {
                buttons = `
                    <button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">In Progress</button>
                    <button onclick="updateTaskStatus(${t.id}, 'DONE')">Done</button>
                `;
            } else if (status === 'IN_PROGRESS') {
                buttons = `
                    <button onclick="updateTaskStatus(${t.id}, 'TODO')">TODO</button>
                    <button onclick="updateTaskStatus(${t.id}, 'DONE')">Done</button>
                `;
            } else if (status === 'DONE') {
                buttons = `
                    <button onclick="updateTaskStatus(${t.id}, 'TODO')">TODO</button>
                    <button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">In Progress</button>
                `;
            }

            return `
                <li data-task-id="${t.id}">
                    <strong>[${status}]</strong> ${t.title} <i>(${t.priority})</i>
                    ${buttons}
                    <button onclick="deleteTask(${t.id})">Delete</button>
                </li>
            `;
        }).join('');
    } catch (err) {
        console.error("Ошибка загрузки задач:", err);
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadTasks(); // Перезагружаем список для отображения изменений
        } else {
            const errorData = await response.json();
            console.error('Ошибка при обновлении статуса задачи:', errorData.error);
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
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