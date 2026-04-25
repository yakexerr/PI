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

db.exec(`
    CREATE TABLE IF NOT EXISTS sprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'TODO',
        project_id INTEGER NOT NULL,
        start_date DATE,
        end_date DATE,
        description TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id)
    )
`);

// Обновление существующей таблицы (миграция для старых данных)
const sprintCols = db.prepare("PRAGMA table_info(sprints)").all();
if (!sprintCols.find(c => c.name === 'start_date')) {
    db.exec("ALTER TABLE sprints ADD COLUMN start_date DATE");
    db.exec("ALTER TABLE sprints ADD COLUMN end_date DATE");
    db.exec("ALTER TABLE sprints ADD COLUMN description TEXT");
}

db.exec(`
    CREATE TABLE IF NOT EXISTS sprint_tasks (
        sprint_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        FOREIGN KEY (sprint_id) REFERENCES sprints (id),
        FOREIGN KEY (task_id) REFERENCES tasks (id)
    )
`);

const userCols = db.prepare("PRAGMA table_info(users)").all();
const roleColumn = userCols.find(c => c.name === 'role');

if (!roleColumn) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'DEVELOPER'");
}

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
    },

    // (TODO)(yakexerr): должен вернуть пустой список если нет активных задач, добавить на сервере проверку!
    getTasksForActiveSprint: (projectId) => {
        const stmt = db.prepare(`
            SELECT t.* FROM tasks t
            JOIN sprint_tasks st ON t.id = st.task_id
            JOIN sprints s ON st.sprint_id = s.id
            WHERE s.status = 'ACTIVE' AND s.project_id = ?
        `);
        // .all там где select, .run это insert, update, delete
        return stmt.all(projectId); 

    
    },

    // (TODO)(yakexerr): нужно ли сделать так чтобы отображались просто все задачи на доске если спринта нет? если да то вот:
    getTasksByProject: (projectId) => {
        const stmt = db.prepare('SELECT * FROM tasks WHERE project_id = ?');
        return stmt.all(projectId);
    },

    // Спринты
    createSprint: (projectId, name) => {
        const stmt = db.prepare("INSERT INTO sprints (project_id, name, status) VALUES (?, ?, 'TODO')");
        return stmt.run(projectId, name);
    },

    getSprintsByProject: (projectId) => {
        const stmt = db.prepare('SELECT * FROM sprints WHERE project_id = ? ORDER BY id DESC');
        return stmt.all(projectId);
    },

    getTasksBySprint: (sprintId) => {
        const stmt = db.prepare(`
            SELECT t.* FROM tasks t
            JOIN sprint_tasks st ON t.id = st.task_id
            WHERE st.sprint_id = ?
        `);
        return stmt.all(sprintId);
    },

    addTaskToSprint: (sprintId, taskId) => {
        // сначала удаляем задачу из других спринтов, если она там была
        db.prepare("DELETE FROM sprint_tasks WHERE task_id = ?").run(taskId);
        const stmt = db.prepare("INSERT INTO sprint_tasks (sprint_id, task_id) VALUES (?, ?)");
        return stmt.run(sprintId, taskId);
    },

    removeTaskFromSprint: (taskId) => {
        const stmt = db.prepare("DELETE FROM sprint_tasks WHERE task_id = ?");
        return stmt.run(taskId);
    },

    startSprint: (sprintId, data) => {
        const sprint = db.prepare("SELECT project_id FROM sprints WHERE id = ?").get(sprintId);
        if (sprint) {
            // Если были другие активные спринты, завершаем их и переносим незавершенные задачи
            const activeSprints = db.prepare("SELECT id FROM sprints WHERE project_id = ? AND status = 'ACTIVE'").all(sprint.project_id);
            activeSprints.forEach(activeSprint => {
                db.prepare(`
                    DELETE FROM sprint_tasks 
                    WHERE sprint_id = ? 
                    AND task_id IN (SELECT id FROM tasks WHERE status != 'DONE')
                `).run(activeSprint.id);
                db.prepare("UPDATE sprints SET status = 'COMPLETED' WHERE id = ?").run(activeSprint.id);
            });
        }
        
        const stmt = db.prepare("UPDATE sprints SET status = 'ACTIVE', name = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?");
        return stmt.run(data.name, data.startDate, data.endDate, data.description, sprintId);
    },

    updateSprintStatus: (sprintId, status) => {
        // Если мы делаем спринт ACTIVE, нужно убедиться, что других ACTIVE спринтов в этом проекте нет
        if (status === 'ACTIVE') {
            const sprint = db.prepare("SELECT project_id FROM sprints WHERE id = ?").get(sprintId);
            if (sprint) {
                // Если были другие активные спринты, завершаем их и переносим незавершенные задачи в бэклог
                const activeSprints = db.prepare("SELECT id FROM sprints WHERE project_id = ? AND status = 'ACTIVE'").all(sprint.project_id);
                activeSprints.forEach(activeSprint => {
                    // Убираем незавершенные задачи из активного спринта (возвращаем в бэклог)
                    db.prepare(`
                        DELETE FROM sprint_tasks 
                        WHERE sprint_id = ? 
                        AND task_id IN (SELECT id FROM tasks WHERE status != 'DONE')
                    `).run(activeSprint.id);
                    db.prepare("UPDATE sprints SET status = 'COMPLETED' WHERE id = ?").run(activeSprint.id);
                });
            }
        }
        
        // Если мы завершаем текущий спринт
        if (status === 'COMPLETED') {
            // Убираем незавершенные задачи из завершаемого спринта (возвращаем в бэклог)
            db.prepare(`
                DELETE FROM sprint_tasks 
                WHERE sprint_id = ? 
                AND task_id IN (SELECT id FROM tasks WHERE status != 'DONE')
            `).run(sprintId);
        }

        const stmt = db.prepare("UPDATE sprints SET status = ? WHERE id = ?");
        return stmt.run(status, sprintId);
    },


    createProject: (name, description) => {
        const stmt = db.prepare("INSERT INTO projects (name, description) VALUES (?, ?)");
        return stmt.run(name, description);
    },


}

// тестовый проект
// TODO: удалить потом

db.exec("INSERT OR IGNORE INTO projects (id, name) VALUES (1, 'Тестовый проект')");