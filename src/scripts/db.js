import Database from "better-sqlite3";

const db = new Database('users.db')

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    lastname TEXT NOT NULL,
    birthDate DATE NOT NULL
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
    }
}