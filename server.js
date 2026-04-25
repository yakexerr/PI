import express from 'express';
import {db, dbActions } from './db.js';
import path from 'path';

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

        // проверяем занят ли юзернейм
        const existingUser = dbActions.getUserByName(user.username)
        if (existingUser) {
            // код ошибки 409 - конфликт запроса с текущим состоянием сервера(т.е. запрос корректен, но нарушает целостность данных)
            return res.status(409).json({ error: 'Пользователь с таким именем уже существует!' });
        }

        dbActions.saveUser(user);
        res.status(201).json({ message: 'Успех', userName: user.name });
    } catch (e) {
        // код ошибки 400 - сервер не может обработать запрос из-за его некорректного синтаксиса, ошибки пользователя

        res.status(400).json({ error: 'Ошибка: ' + e.message });
    }
});


// АВТОРИЗАЦИЯ
app.post('/login', (req, res) => {
    const {username, password} = req.body;
    const user = dbActions.findUser(username, password); 

    if (user) {
        res.json({ message: 'Успех', userName: user.name });
    } else {
        // 401 - Unauthorized - если пользователь вводит неверный логин и пароль или их нет в БД
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
    const projectId = req.query.projectId || 1;
    const rows = db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY position, id DESC").all(projectId);
    res.json(rows);
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
        const projectId = req.query.projectId || 1;
        // Сначала пробуем взять задачи спринта
        let tasks = dbActions.getTasksForActiveSprint(projectId);
        // Если спринта нет, берем все задачи проекта
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

app.patch('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
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

app.delete('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        dbActions.removeTaskFromSprint(id);
        const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
        const info = stmt.run(id);
        if (info.changes > 0) res.json({ message: 'Удалено' });
        else res.status(404).json({ error: 'Не найдено' });
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
        const projectId = 1;
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
        const rows = db.prepare("SELECT * FROM projects").all();
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


app.post('/api/projects', (req, res) => {
    try {
        const { name, description } = req.body;
        // dbActions нужно будет дополнить методом createProject в db.js
        const info = dbActions.createProject(name, description);
        res.json({ id: info.lastInsertRowid, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ВСЕГДА ДОЛЖЕН БЫЬ ВНИЗУ
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
})