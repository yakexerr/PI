document.addEventListener('DOMContentLoaded', () => {

    // --- Логика выпадающего меню проектов ---
    async function initSidebar() {
        const projectListContainer = document.getElementById('dynamic-project-list');
        if (!projectListContainer) return;

        const currentProjectId = localStorage.getItem('currentProjectId') || 1;
        let currentProjectName = "Проект";

        try {
            const res = await fetch('/api/projects');
            if (!res.ok) return;
            
            const projects = await res.json();
            projectListContainer.innerHTML = '';

            projects.forEach(p => {
                if (p.id == currentProjectId) {
                    currentProjectName = p.name;
                }

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

            // Выводим название проекта в заголовок H1
            const h1 = document.querySelector('.task-h1');
            if (h1) {
                let baseText = h1.dataset.baseText || h1.textContent;
                h1.dataset.baseText = baseText; // Сохраняем оригинальный текст
                const safeName = currentProjectName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                h1.innerHTML = `${baseText} – ${currentProjectName} <span class="edit-icon" onclick="openRenameDialog(${currentProjectId}, 'project', '${safeName}')" title="Переименовать проект">&#9998;</span>`;
            }

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

    // Обработчик формы переименования
    const renameForm = document.getElementById('renameForm');
    if (renameForm) {
        renameForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('renameItemId').value;
            const type = document.getElementById('renameItemType').value;
            const newName = document.getElementById('renameInput').value.trim();
            if (!newName) return;

            try {
                let url = '';
                let body = {};
                
                if (type === 'project') {
                    url = `/api/projects/${id}`;
                    body = { name: newName };
                } else if (type === 'task') {
                    url = `/api/tasks/${id}/title`;
                    body = { title: newName };
                }

                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    document.getElementById('renameDialog').close();
                    location.reload(); // Перезагружаем для обновления данных на странице
                }
            } catch (err) {
                console.error("Ошибка переименования:", err);
            }
        };
    }

    // Запускаем инициализацию сайдбара
    initSidebar();
});

// Глобальная функция для открытия окна переименования
window.openRenameDialog = function(id, type, currentName) {
    const dialog = document.getElementById('renameDialog');
    if (!dialog) return;
    
    document.getElementById('renameItemId').value = id;
    document.getElementById('renameItemType').value = type;
    document.getElementById('renameInput').value = currentName;
    
    const title = document.getElementById('renameDialogTitle');
    if (type === 'project') title.textContent = 'Переименовать проект:';
    if (type === 'task') title.textContent = 'Переименовать задачу:';
    
    dialog.showModal();
};