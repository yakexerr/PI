document.getElementById('regForm').addEventListener('submit', function(e) {
    e.preventDefault(); 

    // собираем данные один раз в переменные
    const username = document.getElementById('username').value;
    const p1 = document.getElementById('password').value;
    const p2 = document.getElementById('password_2').value;
    const name = document.getElementById('name').value;
    const lastname = document.getElementById('lastname').value;
    const birthDate = document.getElementById('birthDate').value;

    const errorSpan = document.getElementById('error-message');
    const messageSpan = document.getElementById('message');

    // очищаем старые сообщения
    errorSpan.textContent = "";
    messageSpan.textContent = "";

    // проверка на совпадение паролей
    if (p1 !== p2) {
        errorSpan.textContent = "Пароли не совпадают!";
        return; 
    }

    // создаем объект
    const user = {
        username: username,
        password: p1,
        name: name,
        lastname: lastname,
        birthDate: birthDate
    };

    // отправка данных
    fetch('/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(user)
    })
    .then(async response => {
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('userName', data.userName); // Для приветствия 
            localStorage.setItem('userLogin', username);     // Сохраняем логин для запросов в БД
            // Сохраняем имя (в сервере мы его назвали userName)
            localStorage.setItem('userName', data.userName); 
            
            messageSpan.style.color = "green";
            messageSpan.textContent = "Регистрация успешна! Переходим...";
            
            // Перенаправляем в папку pages
            setTimeout(() => {
                window.location.href = '/pages/homePage.html';
            }, 1500); // Небольшая задержка, чтобы юзер успел увидеть радостный текст
        } else {
            messageSpan.style.color = "red";
            messageSpan.textContent = data.error || "Ошибка регистрации";
        }
    })
    .catch(err => {
        console.error('Ошибка сети или сервера:', err);
        messageSpan.textContent = "Не удалось связаться с сервером";
    });
});