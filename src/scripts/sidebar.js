document.addEventListener('DOMContentLoaded', () => {

    // --- Логика выпадающего меню проектов ---
    async function initSidebar() {
        const projectListContainer = document.getElementById('dynamic-project-list');
        if (!projectListContainer) return;

        try {
            const res = await fetch('/api/projects');
            if (!res.ok) return;
            
            const projects = await res.json();
            projectListContainer.innerHTML = '';

            projects.forEach(p => {
                const a = document.createElement('a');
                a.textContent = p.name;
                a.href = "tasksPage.html";
                a.className = "project-item";
                
                a.onclick = (e) => {
                    e.preventDefault();
                    localStorage.setItem('currentProjectId', p.id);
                    window.location.href = 'tasksPage.html';
                };
                projectListContainer.appendChild(a);
            });

        } catch (err) {
            console.error("Ошибка в initSidebar:", err);
        }
    }

    // --- Логика диалогового окна создания проекта ---
    const createProjectBtn = document.querySelector('.create-project-btn');
    const projectDialog = document.getElementById('projectDialog');
    const projectFormDialog = document.getElementById('projectFormDialog');

    // Вешаем слушатель на кнопку, ТОЛЬКО если она есть на странице
    if (createProjectBtn && projectDialog) {
        createProjectBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Предотвращаем переход по ссылке #
            projectDialog.showModal();
        });
    }

    // Вешаем слушатель на форму, ТОЛЬКО если она есть
    if (projectFormDialog) {
        projectFormDialog.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('projectName').value;
            const desc = document.getElementById('projectDesc').value;

            try {
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name, description: desc })
                });

                if (response.ok) {
                    // 1. Получаем ответ от сервера
                    const newProject = await response.json();
                    
                    // 2. Вытаскиваем ID нового проекта
                    const newProjectId = newProject.id; 

                    // 3. Устанавливаем его как ТЕКУЩИЙ
                    localStorage.setItem('currentProjectId', newProjectId);

                    // 4. Перенаправляем на доску задач, чтобы сразу видеть пустую доску нового проекта
                    window.location.href = 'tasksPage.html'; 
                } else {
                    alert("Ошибка при создании проекта");
                }
            } catch (err) {
                console.error("Ошибка сети:", err);
            }
        };
    }

    // Запускаем инициализацию сайдбара
    initSidebar();
});