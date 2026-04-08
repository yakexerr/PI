// import {loadBacklog} from './tasks.js'

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
        
        // Исправлено: очищаем value, а не перезаписываем переменные
        input.value = '';
        descriptionInput.value = '';
        priorityInput.value = 'Средний'; 
        
        dialog.close();
    }
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
            loadBacklog(); // перезагружаем список
            
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



async function loadBacklog() {
    try {
        const res = await fetch('/api/backlogs');
        const tasks = await res.json();
        
        // const lists = {
        //     'TODO': document.querySelector('#col-todo .task-list'),
        //     'IN_PROGRESS': document.querySelector('#col-progress .task-list'),
        //     'TESTING': document.querySelector('#col-testing .task-list'),
        //     'DONE': document.querySelector('#col-done .task-list')
        // };
        const location = document.querySelector('#blShow .bl-list');
        
        // очищаем список чтобы при отрисовывании задачи не дублировались (именно в list.innerHTML = "" - типа всё что внутри элемента очсищаем) 
        // Object.values(lists).forEach(list => list.innerHTML = "");
        location.innerHTML = "";

        tasks.forEach(t => {
            // const status = t.status || 'TODO';
            // const targetList = lists[status];

            if (location) {
                const li = document.createElement('li');
                li.className = `task-card priority-${t.priority}`;
                li.dataset.taskId = t.id;
                
                // Генерируем кнопки в зависимости от статуса
                let buttonsHtml = '';
                // if (status === 'TODO') {
                //     buttonsHtml = `<button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">В работу</button>`;
                // } else if (status === 'IN_PROGRESS') {
                //     buttonsHtml = `
                //         <button onclick="updateTaskStatus(${t.id}, 'TODO')">Назад</button>
                //         <button onclick="updateTaskStatus(${t.id}, 'TESTING')">Тестировать</button>
                //     `;
                // } else if (status === 'TESTING') {
                //     buttonsHtml = `
                //         <button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">Назад</button>
                //         <button onclick="updateTaskStatus(${t.id}, 'DONE')">Готово</button>
                //     `;
                // } else if (status === 'DONE') {
                //     buttonsHtml = `<button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')">Вернуть в работу</button>`;
                // }

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
                        <button class="btn-delete" onclick="if(confirm('Удалить задачу?')) deleteBacklog(${t.id})">Удалить</button>
                    </div>
                `;
                location.appendChild(li);
            }
        });
        // initSortable();
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

        if (response.ok) {
            loadBacklog();
        }
    } catch (err) {
        console.error("Ошибка при смене приоритета:", err);
    }
}

loadBacklog();

function initSortable() {
    const lists = document.querySelectorAll('.task-list');
    lists.forEach(list => {
        new Sortable(list, {
            group: 'shared',
            animation: 150,
            onEnd: function (evt) {
                const taskId = evt.item.dataset.taskId;
                
                // Если перетащили В ДРУГУЮ колонку
                if (evt.from !== evt.to) {
                    const parentId = evt.to.parentElement.id;
                    let newStatus = '';
                    if (parentId === 'col-todo') newStatus = 'TODO';
                    else if (parentId === 'col-progress') newStatus = 'IN_PROGRESS'; // Явно прописываем
                    else if (parentId === 'col-testing') newStatus = 'TESTING';
                    else if (parentId === 'col-done') newStatus = 'DONE';

                    updateTaskStatus(taskId, newStatus);
                } 
                // Если перетащили ВНУТРИ одной колонки (сортировка)
                else {
                    const taskIds = Array.from(evt.to.children).map(item => item.dataset.taskId);
                    fetch('/api/backlogs/order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order: taskIds })
                    }).catch(err => console.error("Ошибка при обновлении порядка:", err));
                }
            }
        });
    });
}

async function deleteBacklog(taskId) {
    try {
        const response = await fetch(`/api/backlogs/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadBacklog(); // Перезагружаем список для отображения изменений
        } else {
            const errorData = await response.json();
            console.error('Ошибка при удалении задачи:', errorData.error);
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
    }
}