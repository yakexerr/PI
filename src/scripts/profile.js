document.addEventListener('DOMContentLoaded', () => {
    const userLogin = localStorage.getItem('userLogin');
    const userId = localStorage.getItem('userId') || 1; // Берем ID для "стабильного" рандома

    if (!userLogin) {
        window.location.href = '/pages/authPage.html';
        return;
    }

    // -- для аватарки
    const avatarCount = 5; // Укажи здесь, сколько у тебя картинок в папке assets
    const avatarIndex = Math.floor(Math.random() * avatarCount) + 1; // если каждый раз при обновлении
    // const avatarIndex = (userId % avatarCount) + 1; // если не каждый раз
    const avatarImg = document.getElementById('p-avatar');
    if (avatarImg) {
        avatarImg.src = `/assets/ava${avatarIndex}.jpeg`;
    }
    // --

    fetch(`/api/user-info?username=${userLogin}`)
        .then(res => res.json())
        .then(user => {
            if (user.error) {
                alert("Ошибка загрузки данных");
            } else {
                document.getElementById('p-name').textContent = user.name;
                document.getElementById('p-lastname').textContent = user.lastname;
                document.getElementById('p-birthDate').textContent = user.birthDate;
                document.getElementById('p-role').textContent = user.role;
            }
        })
        .catch(err => console.error("Ошибка:", err));
});