document.addEventListener('DOMContentLoaded', function() {
    // Cargar el menú
    fetch(`${window.appConfig.componentsBaseUrl}/menu.html`)
        .then(response => response.text())
        .then(html => {
            document.querySelector('header').insertAdjacentHTML('afterbegin', html);
        })
        .catch(error => console.error('Error loading menu:', error));
}); 