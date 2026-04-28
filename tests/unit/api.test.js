import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js'; // Путь к server.js
import { dbActions } from '../../db.js';

describe('Тестирование API проектов и задач', () => {

    it('GET /api/projects должен возвращать список проектов', async () => {
        // фейковый запрос к серверу без его реального запуска
        const response = await request(app).get('/api/projects');
        
        // проверка, что статус 200 OK
        expect(response.status).toBe(200);
        // проверка, что пришел массив (список)
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /api/projects должен создавать новый проект', async () => {
        const newProject = {
            name: 'Тестовый авто-проект',
            description: 'Создан для проверки API'
        };

        const response = await request(app)
            .post('/api/projects')
            .send(newProject);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Тестовый авто-проект');
    });

    it('GET /api/tasks должен возвращать задачи для проекта', async () => {
        // Отправляем параметр projectId=1
        const response = await request(app).get('/api/tasks?projectId=1');
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /api/tasks должен возвращать ошибку при неполных данных (проверка валидации)', async () => {
        // Посылаем пустой запрос (без title)
        const response = await request(app)
            .post('/api/tasks')
            .send({});

        // Сервер должен вернуть ошибку 500, так как title это NOT NULL в БД
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
    });

});