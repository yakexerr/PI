import express from 'express';
import { dbActions } from './db.js';
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


app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
})

// ПРОФИЛЬ
app.get('/api/user-info', (req, res) => {
    const username = req.query.username; // Получаем логин из параметров ссылки
    const user = dbActions.getUserData(username);

    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});