import Database from "better-sqlite3";
export const db = new Database('users.db')

db.exec("PRAGMA foreign_keys = ON;"); // на всякий случай, чтобы внешние ключи тоже были включены
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    lastname TEXT NOT NULL,
    birthDate DATE NOT NULL,
    role TEXT DEFAULT 'DEVELOPER'
    )
    `);


// Таблица проектов
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    manager_id INTEGER,
    status TEXT DEFAULT 'PLANNING', -- PLANNING, ACTIVE, COMPLETED, CANCELLED
    startDate DATE,
    endDate DATE,
    FOREIGN KEY (manager_id) REFERENCES users (id)
)
`);

// Таблица задач
/*
type содержит BUG, FEATURE, IMPROVEMENT
priority содержит LOW, MEDIUM, HIGH, CRITICAL - нет enum, обходимся текстом
status содержит TODO, IN_PROGRESS, TESTING, DONE
assignee_id содержит исполнителя
reporter_id содержит того, кто создал задачу
*/
db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'TASK',
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'TODO',
    assignee_id INTEGER,
    reporter_id INTEGER,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (assignee_id) REFERENCES users (id),
    FOREIGN KEY (reporter_id) REFERENCES users (id)
)
`);

const columns = db.prepare("PRAGMA table_info(tasks)").all();
const positionColumn = columns.find(c => c.name === 'position');

if (!positionColumn) {
    db.exec("ALTER TABLE tasks ADD COLUMN position INTEGER");
    db.exec("UPDATE tasks SET position = id");
}


// Таблица комментариев
db.exec(`
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks (id),
    FOREIGN KEY (author_id) REFERENCES users (id)
)
`);

// это объект-синглтон - по сути готовый экземпляр с методами (похоже на статический класс)
export const dbActions = {
    saveUser: (user) => {
        // prepare типа сохраняет шаблон и благодаря нему мы можем выполнять insert.run
        const insert = db.prepare(`
            INSERT INTO users (username, password, name, lastname, birthDate)
             VALUES (?,?,?,?,?)    
        `);
        return insert.run(
            user.username,
            user.password,
            user.name,
            user.lastname,
            user.birthDate,
        );
    },

    getUsers: () => {
        const rows = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
        return rows;
    },

    findUser: (username, password) => {
        const isFind = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
        return isFind.get(username, password)
    },

    getUserByName: (username) => { // проверка существующих имен пользователей
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        return stmt.get(username);
    },

    getUserData: (username) => {
    const stmt = db.prepare('SELECT name, lastname, birthDate, role FROM users WHERE username = ?');
    return stmt.get(username);
    }
}

// тестовый проект
// TODO: удалить потом
// db.exec("INSERT OR IGNORE INTO projects (id, name) VALUES (1, 'Мой первый проект')");