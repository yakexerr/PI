import express from 'express';
import {db, dbActions } from './db.js';
// экспорт app для тестов
export { app }; 

const app = express();
const PORT = 3000;

app.use(express.json()); // для того чтобы сервер понимал json из fetch запросов

app.use(express.static('src')) // чтобы сервер мог передавать статические файлы вроде css, html и js

app.get('/', (req, res) => {
    res.redirect('/pages/unautirizPage.html');
});

// РЕГИСТРАЦИЯ
app.post('/register', (req, res) => {
    try {
        const user = req.body;
        const existingUser = dbActions.getUserByName(user.username);
        if (existingUser) {
            return res.status(409).json({ error: 'Пользователь уже существует!' });
        }

        // dbActions.saveUser должен возвращать результат выполнения (с lastInsertRowid)
        const info = dbActions.saveUser(user); 
        
        res.status(201).json({ 
            message: 'Успех', 
            userId: info.lastInsertRowid, // ОТДАЕМ ID
            userName: user.name,
            userRole: 'MANAGER' // По умолчанию для новых
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


// АВТОРИЗАЦИЯ
// server.js

// 1. Исправляем логин
app.post('/login', (req, res) => {
    const {username, password} = req.body;
    const user = dbActions.findUser(username, password); 

    if (user) {
        res.json({ 
            message: 'Успех', 
            userId: user.id, 
            userName: user.name, 
            userLogin: user.username,
            userRole: user.role
        });
    } else {
        res.status(401).json({message: 'Неверный логин или пароль'})
    }
});


// --- ПРОФИЛЬ ---
app.get('/api/user-info', (req, res) => {
    const username = req.query.username;
    const user = dbActions.getUserData(username);
    if (user) res.json(user);
    else res.status(404).json({ error: 'Пользователь не найден' });
});

// --- ЗАДАЧИ ---
// Отдать список задач
app.get('/api/backlogs', (req, res) => {
    try {
        const { projectId } = req.query;
        
        // Если ID проекта не пришел, возвращаем пустой список (безопасность!)
        if (!projectId) return res.json([]);

        const rows = db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY position, id DESC")
                       .all(projectId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Принять новую задачу
app.post('/api/backlogs', (req, res) => {
    try {
        const { title, project_id, priority } = req.body;
        const pId = project_id || 1;

        // Получаем максимальную позицию и ставим новую задачу в конец
        const posStmt = db.prepare("SELECT MAX(position) as max_pos FROM tasks");
        const maxPos = posStmt.get().max_pos || 0;
        const newPos = maxPos + 1;

        const stmt = db.prepare("INSERT INTO tasks (title, project_id, status, priority, position) VALUES (?, ?, ?, ?, ?)");
        const info = stmt.run(title, pId, 'TODO', priority, newPos);
        res.json({ id: info.lastInsertRowid, title, status: 'TODO', priority, position: newPos });
    } catch (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Обновить порядок задач
app.post('/api/backlogs/order', (req, res) => {
    try {
        const { order } = req.body;
        
        const updateStmt = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");

        db.transaction(() => {
            order.forEach((taskId, index) => {
                updateStmt.run(index, taskId);
            });
        })();

        res.json({ message: 'Порядок задач обновлен' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновить название задачи
app.patch('/api/tasks/:id/title', (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const stmt = db.prepare("UPDATE tasks SET title = ? WHERE id = ?");
        const info = stmt.run(title, id);

        if (info.changes > 0) {
            res.json({ message: 'Название задачи обновлено', id, title });
        } else {
            res.status(404).json({ error: 'Задача не найдена' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновить статус задачи
app.put('/api/backlogs/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const stmt = db.prepare("UPDATE tasks SET status = ? WHERE id = ?");
        const info = stmt.run(status, id);

        if (info.changes > 0) {
            res.json({ message: 'Статус задачи обновлен' });
        } else {
            res.status(404).json({ error: 'Задача не найдена' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удалить задачу
app.delete('/api/backlogs/:id', (req, res) => {
    try {
        const { id } = req.params;
        const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
        const info = stmt.run(id);

        if (info.changes > 0) {
            res.json({ message: 'Задача удалена' });
        } else {
            res.status(404).json({ error: 'Задача не найдена' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Обновить статус задачи
app.patch('/api/backlogs/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Получаем новый статус из запроса
        
        const stmt = db.prepare("UPDATE tasks SET status = ? WHERE id = ?");
        const info = stmt.run(status, id);

        if (info.changes > 0) {
            res.json({ message: 'Статус обновлен', id, status });
        } else {
            res.status(404).json({ error: 'Задача не найдена' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновить приоритет задачи
app.patch('/api/backlogs/:id/priority', (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;
        
        const stmt = db.prepare("UPDATE tasks SET priority = ? WHERE id = ?");
        const info = stmt.run(priority, id);

        if (info.changes > 0) {
            res.json({ message: 'Приоритет обновлен', id, priority });
        } else {
            res.status(404).json({ error: 'Задача не найдена' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ДОСКА (Задачи активного спринта)

// Отдать задачи только для активного спринта
app.get('/api/tasks', (req, res) => {
    try {
        const projectId = req.query.projectId; // УБРАЛИ || 1
        if (!projectId) return res.json([]); // Если проекта нет в запросе — отдаем пустоту

        let tasks = dbActions.getTasksForActiveSprint(projectId);
        if (!tasks || tasks.length === 0) {
            tasks = dbActions.getTasksByProject(projectId);
        }
        res.json(tasks);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


app.post('/api/tasks', (req, res) => {
    try {
        const { title, project_id, priority } = req.body;
        const pId = project_id || 1;
        const posStmt = db.prepare("SELECT MAX(position) as max_pos FROM tasks");
        const maxPos = posStmt.get().max_pos || 0;
        const newPos = maxPos + 1;
        const stmt = db.prepare("INSERT INTO tasks (title, project_id, status, priority, position) VALUES (?, ?, 'TODO', ?, ?)");
        const info = stmt.run(title, pId, priority, newPos);
        
        const activeSprint = db.prepare("SELECT id FROM sprints WHERE project_id = ? AND status = 'ACTIVE'").get(pId);
        if (activeSprint) {
            dbActions.addTaskToSprint(activeSprint.id, info.lastInsertRowid);
        }
        res.json({ id: info.lastInsertRowid, title, status: 'TODO', priority, position: newPos });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// server.js

app.patch('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Имитируем получение роли из сессии/заголовка
        // В реальном проекте мы бы сделали запрос к БД или проверили JWT
        const userRole = req.headers['x-user-role']; 

        if (userRole === 'DEVELOPER' && status === 'DONE') {
            return res.status(403).json({ error: "Разработчику запрещено закрывать задачи" });
        }
        
        if (userRole === 'TESTER' && status === 'IN_PROGRESS') {
            return res.status(403).json({ error: "Тестировщику запрещено брать задачи в работу" });
        }

        const stmt = db.prepare("UPDATE tasks SET status = ? WHERE id = ?");
        stmt.run(status, id);
        res.json({ message: 'Ок' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/tasks/:id/priority', (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;
        const stmt = db.prepare("UPDATE tasks SET priority = ? WHERE id = ?");
        const info = stmt.run(priority, id);
        if (info.changes > 0) res.json({ message: 'Приоритет обновлен' });
        else res.status(404).json({ error: 'Не найдено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Защита удаления (только для Менеджера, Админа или Соло)
app.delete('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        // Мы можем передавать роль в заголовках для проверки
        const userRole = req.headers['x-user-role']; 

        if (userRole === 'DEVELOPER' || userRole === 'TESTER') {
            return res.status(403).json({ error: "Доступ запрещен: недостаточно прав" });
        }

        dbActions.removeTaskFromSprint(id);
        db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        res.json({ message: 'Удалено' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/tasks/order', (req, res) => {
    try {
        const { order } = req.body;
        const updateStmt = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
        db.transaction(() => {
            order.forEach((taskId, index) => {
                updateStmt.run(index, taskId);
            });
        })();
        res.json({ message: 'Порядок обновлен' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// СПРИНТЫ
app.get('/api/sprints', (req, res) => {
    try {
        const projectId = req.query.projectId || 1;
        const sprints = dbActions.getSprintsByProject(projectId);
        
        // для каждого спринта получаем его задачи
        sprints.forEach(sprint => {
            sprint.tasks = dbActions.getTasksBySprint(sprint.id);
        });
        
        res.json(sprints);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sprints', (req, res) => {
    try {
        const { name, project_id } = req.body;
        const pId = project_id || 1;
        const info = dbActions.createSprint(pId, name || 'Новый спринт');
        res.json({ id: info.lastInsertRowid, name, status: 'TODO' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sprints/:id/tasks', (req, res) => {
    try {
        const sprintId = req.params.id;
        const { task_id } = req.body;
        dbActions.addTaskToSprint(sprintId, task_id);
        res.json({ message: 'Задача добавлена в спринт' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sprints/tasks/:taskId', (req, res) => {
    try {
        const taskId = req.params.taskId;
        dbActions.removeTaskFromSprint(taskId);
        res.json({ message: 'Задача убрана из спринта' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sprints/:id/start', (req, res) => {
    try {
        const sprintId = req.params.id;
        const data = req.body; // { name, startDate, endDate, description }
        dbActions.startSprint(sprintId, data);
        res.json({ message: 'Спринт начат' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sprints/:id/status', (req, res) => {
    try {
        const sprintId = req.params.id;
        const { status } = req.body;
        dbActions.updateSprintStatus(sprintId, status);
        res.json({ message: 'Статус спринта обновлен', status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить список всех проектов
app.get('/api/projects', (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.json([]);

        let rows;
        if (username === 'admin') {
            // Админ видит ВООБЩЕ ВСЕ проекты системы
            rows = db.prepare("SELECT * FROM projects").all();
        } else {
            // Остальные видят только свои
            rows = db.prepare(`
                SELECT p.* FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                JOIN users u ON pm.user_id = u.id
                WHERE u.username = ?
            `).all(username);
        }
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


app.post('/api/projects', (req, res) => {
    try {
        // Сервер получает userId из запроса фронтенда
        const { name, description, userId } = req.body; 
        
        // 1. Создаем сам проект
        const info = dbActions.createProject(name, description);
        const projectId = info.lastInsertRowid;

        // 2. Если ID юзера пришел, привязываем его к проекту
        if (userId) {
            db.prepare("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)")
              .run(projectId, userId);
            console.log(`Проект ${projectId} привязан к юзеру ${userId}`);
        }

        res.json({ id: projectId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/projects/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const stmt = db.prepare("UPDATE projects SET name = ? WHERE id = ?");
        const info = stmt.run(name, id);
        if (info.changes > 0) res.json({ message: 'Проект обновлен' });
        else res.status(404).json({ error: 'Проект не найден' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ВСЕГДА ДОЛЖЕН БЫЬ ВНИЗУ
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
})

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
}

// --- АДМИН-ПАНЕЛЬ ---

// Получить список всех пользователей
app.get('/api/admin/users', (req, res) => {
    try {
        // Показываем только DEVELOPER и TESTER
        // Это скроет всех "самостоятельных" менеджеров и других админов
        const rows = db.prepare(`
            SELECT * FROM users 
            WHERE role IN ('DEVELOPER', 'TESTER') 
            ORDER BY id DESC
        `).all();
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать нового сотрудника (логика Менеджера/Админа)
app.post('/api/admin/create-user', (req, res) => {
    try {
        const { name, lastname, username, password, role } = req.body;
        
        // Проверяем, не занят ли логин
        const existing = dbActions.getUserByName(username);
        if (existing) {
            return res.status(400).json({ error: "Пользователь с таким логином уже есть" });
        }

        const info = dbActions.createEmployee({ name, lastname, username, password, role });
        res.json({ message: "Успешно создан", id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects/:id/members', (req, res) => {
    try {
        const projectId = req.params.id;
        const { memberUsername } = req.body;

        const user = db.prepare("SELECT id FROM users WHERE username = ?").get(memberUsername);
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });

        // Добавляем в таблицу связей
        db.prepare("INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)")
          .run(projectId, user.id);

        res.json({ message: "Участник добавлен" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});