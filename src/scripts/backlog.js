// import {loadTasks} from './tasks.js'

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
        const response = await fetch('/api/tasks', {
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
            // loadTasks(); // перезагружаем список
            
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

async function deleteBacklog(taskId) {
    if (!confirm('Удалить этот беклог?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const messageSpan = document.getElementById('message');
            messageSpan.style.color = "green";
            messageSpan.textContent = "Беклог удалён!";
            // loadTasks();
            
            setTimeout(() => {
                messageSpan.textContent = '';
            }, 3000);
        } else {
            const errorData = await response.json();
            console.error('Ошибка при удалении задачи:', errorData.error);
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
    }
}