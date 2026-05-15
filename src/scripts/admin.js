document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('userRole');

    // Защита входа
    if (role !== 'ADMIN' && role !== 'MANAGER') {
        alert("Доступ запрещен!");
        window.location.href = 'tasksPage.html';
        return;
    }

    const form = document.getElementById('createEmployeeForm');
    const msg = document.getElementById('admin-message');

    // Функция загрузки списка (теперь внутри, чтобы видеть элементы страницы)
    async function loadUsersList() {
        try {
            const currentProjId = localStorage.getItem('currentProjectId');
            const userLogin = localStorage.getItem('userLogin');

            // Получаем всех сотрудников
            const resAll = await fetch('/api/admin/users');
            const allUsers = await resAll.json();

            // Получаем ID тех, кто уже в текущем проекте
            let memberIds = [];
            if (currentProjId) {
                const resMembers = await fetch(`/api/projects/${currentProjId}/members-ids`);
                if (resMembers.ok) memberIds = await resMembers.json();
                
                // Заодно обновим название проекта в заголовке
                const resProj = await fetch(`/api/projects?username=${userLogin}`);
                const projects = await resProj.json();
                const currentProj = projects.find(p => p.id == currentProjId);
                if (currentProj) {
                    document.getElementById('current-project-display').textContent = currentProj.name;
                }
            }

            const tbody = document.getElementById('user-list-tbody');
            if (!tbody) return;

            tbody.innerHTML = allUsers.map(u => {
                // Проверяем, есть ли ID этого юзера в списке участников проекта
                const isMember = memberIds.includes(u.id);

                return `
                    <tr style="border-bottom: 1px solid #eee; background: ${isMember ? '#f9f9f9' : 'white'}">
                        <td style="padding: 10px;">${u.name} ${u.lastname}</td>
                        <td style="padding: 10px;"><strong>${u.username}</strong></td>
                        <td style="padding: 10px;"><code style="background: #eee; padding: 2px 4px;">${u.password}</code></td>
                        <td style="padding: 10px;">${u.role}</td>
                        <td style="padding: 10px;">
                            ${isMember 
                                ? `<span style="color: green; font-size: 12px; font-weight: bold;">✔ В проекте</span>`
                                : `<button class="btn-submit" 
                                        style="width: auto; padding: 5px 10px; font-size: 11px;" 
                                        onclick="inviteToProject('${u.username}')">
                                    + Добавить
                                </button>`
                            }
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error("Ошибка загрузки:", err);
        }
    }

    // Сразу загружаем список при открытии страницы
    loadUsersList();

    // Обработка формы создания
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            const employeeData = {
                name: document.getElementById('empName').value,
                lastname: document.getElementById('empLastname').value,
                username: document.getElementById('empLogin').value,
                password: document.getElementById('empPassword').value,
                role: document.getElementById('empRole').value
            };

            try {
                const response = await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                });

                const result = await response.json();

                if (response.ok) {
                    msg.style.color = "green";
                    msg.textContent = "Сотрудник успешно добавлен!";
                    form.reset();
                    loadUsersList(); 
                } else {
                    msg.style.color = "red";
                    msg.textContent = result.error || "Ошибка создания";
                }
            } catch (err) {
                msg.textContent = "Ошибка связи с сервером";
            }
        };
    }
});

window.inviteToProject = async (targetUsername) => {
    const currentProjId = localStorage.getItem('currentProjectId');
    
    if (!currentProjId) {
        alert("Сначала выберите проект в сайдбаре слева!");
        return;
    }

    try {
        const response = await fetch(`/api/projects/${currentProjId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberUsername: targetUsername })
        });

        if (response.ok) {
            alert(`Пользователь ${targetUsername} успешно добавлен в проект!`);
            loadUsersList();
        } else {
            const err = await response.json();
            alert("Ошибка: " + err.error);
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
    }
};