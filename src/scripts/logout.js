document.getElementById('logout-button').addEventListener('click', () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userLogin');
    window.location.href = 'authPage.html';
});
