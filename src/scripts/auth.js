document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); 

    // собираем данные один раз в переменные
    const username = document.getElementById('username').value;
    const p1 = document.getElementById('password').value;


    const messageSpan = document.getElementById('message');

    // очищаем старые сообщения
    messageSpan.textContent = "";

    // формируем объект для отправки
    const credentials = {
        username: username,
        password: p1
    };


    // отправка данных
    fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(credentials)
    })
    .then(async response => {
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('userName', data.userName); // Для приветствия 
            localStorage.setItem('userLogin', username);     // Сохраняем логин для запросов в БД
            // Теперь сервер присылает userName
            localStorage.setItem('userName', data.userName); 
            
            messageSpan.style.color = "green";
            messageSpan.textContent = "Вход выполнен! Переходим...";
            
            setTimeout(() => {
                window.location.href = '/pages/profilePage.html'; 
            }, 1500);
        } else {
            messageSpan.style.color = "red";
            messageSpan.textContent = data.message || "Ошибка входа";
        }
    })
    .catch(err => {
        console.error('Ошибка:', err);
        messageSpan.textContent = "Не удалось связаться с сервером";
    });
});