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
app.get('/api/tasks', (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM tasks ORDER BY id DESC").all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Принять новую задачу
app.post('/api/tasks', (req, res) => {
    try {
        const { title, project_id, priority } = req.body;
        const pId = project_id || 1; 
        const stmt = db.prepare("INSERT INTO tasks (title, project_id, status, priority) VALUES (?, ?, 'TODO', ?)");
        const info = stmt.run(title, pId, priority);
        res.json({ id: info.lastInsertRowid, title, status: 'TODO', priority });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновить статус задачи
app.put('/api/tasks/:id/status', (req, res) => {
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
app.delete('/api/tasks/:id', (req, res) => {
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


// ВСЕГДА ДОЛЖЕН БЫЬ ВНИЗУ
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
})