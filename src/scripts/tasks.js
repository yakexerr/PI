// Функция загрузки списка
async function loadTasks() {
    try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        const list = document.getElementById('taskList');
        
        // Отрисовываем список
        list.innerHTML = tasks.map(t => `
            <li>
                <strong>[${t.status || 'TODO'}]</strong> ${t.title}
            </li>
        `).join('');
    } catch (err) {
        console.error("Ошибка загрузки задач:", err);
    }
}

// Загружаем при старте страницы
loadTasks();

// Обработка формы
document.getElementById('taskForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const titleInput = document.getElementById('taskTitle');
    const messageSpan = document.getElementById('message');
    const title = titleInput.value;

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            // отправляем объект по ТЗ: title и project_id
            body: JSON.stringify({ title: title, project_id: 1 })
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