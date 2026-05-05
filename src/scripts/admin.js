document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('userRole');

    // 1. Защита входа
    if (role !== 'ADMIN' && role !== 'MANAGER') {
        alert("Доступ запрещен!");
        window.location.href = 'tasksPage.html';
        return;
    }

    const form = document.getElementById('createEmployeeForm');
    const msg = document.getElementById('admin-message');

    // 2. Функция загрузки списка (теперь внутри, чтобы видеть элементы страницы)
    async function loadUsersList() {
        try {
            const res = await fetch('/api/admin/users');
            const users = await res.json();
            const tbody = document.getElementById('user-list-tbody');
            
            if (!tbody) return;

            // Получаем текущий выбранный проект, чтобы знать, куда добавлять
            const currentProjId = localStorage.getItem('currentProjectId');

            tbody.innerHTML = users.map(u => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${u.name} ${u.lastname}</td>
                    <td style="padding: 10px;"><strong>${u.username}</strong></td>
                    <td style="padding: 10px;"><code style="background: #eee; padding: 2px 4px;">${u.password}</code></td>
                    <td style="padding: 10px;">${u.role}</td>
                    <td style="padding: 10px;">
                        <button class="btn-submit" 
                                style="width: auto; padding: 5px 10px; font-size: 11px;" 
                                onclick="inviteToProject('${u.username}')">
                            + В проект
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error("Ошибка загрузки списка юзеров:", err);
        }
    }

    // 3. Сразу загружаем список при открытии страницы
    loadUsersList();

    // 4. Обработка формы создания
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
                    loadUsersList(); // Обновляем таблицу после добавления
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
        } else {
            const err = await response.json();
            alert("Ошибка: " + err.error);
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
    }
};