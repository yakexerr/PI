document.addEventListener('DOMContentLoaded', () => {
    // берем логин из localStorage
    const userLogin = localStorage.getItem('userLogin');

    if (!userLogin) {
        // если логина нет, значит пользователь не вошел — кидаем на страницу входа
        window.location.href = '/pages/authPage.html';
        return;
    }

    // запрашиваем данные с сервера
    fetch(`/api/user-info?username=${userLogin}`)
        .then(res => res.json())
        .then(user => {
            if (user.error) {
                alert("Ошибка загрузки данных");
            } else {
                // заполняем поля на странице
                document.getElementById('p-name').textContent = user.name;
                document.getElementById('p-lastname').textContent = user.lastname;
                document.getElementById('p-birthDate').textContent = user.birthDate;
                document.getElementById('p-role').textContent = user.role;
            }
        })
        .catch(err => console.error("Ошибка:", err));
});