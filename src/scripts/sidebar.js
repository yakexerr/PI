document.addEventListener('DOMContentLoaded', () => {

    // --- Логика выпадающего меню проектов ---
    async function initSidebar() {
        const projectListContainer = document.getElementById('dynamic-project-list');
        if (!projectListContainer) return;

        // 1. Берем логин текущего пользователя
        const userLogin = localStorage.getItem('userLogin');
        if (!userLogin) return; // Если не вошли, проекты не грузим

        // 2. Убираем жесткую привязку к ID 1. Если проекта нет - пусть будет null.
        const currentProjectId = localStorage.getItem('currentProjectId');
        let currentProjectName = "";

        try {
            // 3. ОБЯЗАТЕЛЬНО передаем username серверу
            const res = await fetch(`/api/projects?username=${userLogin}`);
            if (!res.ok) return;
            
            const projects = await res.json();
            projectListContainer.innerHTML = '';

            projects.forEach(p => {
                // Если этот проект сейчас выбран, запоминаем имя для заголовка
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

            // 4. Логика заголовка H1
            const h1 = document.querySelector('.task-h1');
            if (h1) {
                let baseText = h1.dataset.baseText || h1.textContent;
                h1.dataset.baseText = baseText; 

                if (currentProjectName) {
                    const safeName = currentProjectName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    h1.innerHTML = `${baseText} – ${currentProjectName} <span class="edit-icon" onclick="openRenameDialog(${currentProjectId}, 'project', '${safeName}')" title="Переименовать проект">&#9998;</span>`;
                } else {
                    h1.textContent = baseText + " (выберите проект)";
                }
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
        
        // Достаем ID пользователя из хранилища
        const userId = localStorage.getItem('userId');

        try {
            const userLogin = localStorage.getItem('userLogin'); // Берем логин из памяти

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    name: name, 
                    description: desc, 
                    username: userLogin // ОТПРАВЛЯЕМ ЛОГИН
                })
            });
            if (response.ok) {
                const newProject = await response.json();
                localStorage.setItem('currentProjectId', newProject.id);
                window.location.href = 'tasksPage.html'; 
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
    const role = localStorage.getItem('userRole');
    const adminLink = document.getElementById('admin-link');

    if (adminLink) {
        // Теперь вкладка "Команда" видна ТОЛЬКО пользователю с ролью ADMIN
        if (role === 'ADMIN') {
            adminLink.parentElement.style.display = 'block'; 
        } else {
            adminLink.parentElement.style.display = 'none'; 
        }
    }
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

