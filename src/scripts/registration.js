import { error } from "node:console";

document.getElementById('regForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Останавливаем перезагрузку

    const p1 = document.getElementById('password').value;
    const p2 = document.getElementById('password_2').value;
    const username = document.getElementById('username').value;

    const errorSpan = document.getElementById('error-message');
    // проверка на совпадение
    if (p1 !== p2) {
        errorSpan.textContent = "Пароли не совпадают!";
        return; 
    } else {
        errorSpan.textContent = "";
    }

    //если пароли совпали, то создаем объект.
    const user = {
        username: username,
        password: p1
    };

    // отправка данных
    const span = document.getElementById('message');
    fetch('/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(user)
    })
    .then(response => {
        if (response.ok) {
            span.textContent = "Регистрация успешна!"
        } else {
            span.textContent = "Ошибка сервера"
        }
    })
    .catch(error => console.error('Ошибка:', error));
});