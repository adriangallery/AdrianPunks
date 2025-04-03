document.addEventListener('DOMContentLoaded', function() {
    const menuHTML = `
        <nav class="menu">
            <a href="/">Home</a>
            <a href="/market">Marketplace</a>
            <a href="/mint">Mint</a>
        </nav>
    `;
    
    const header = document.querySelector('header');
    if (header) {
        header.insertAdjacentHTML('afterbegin', menuHTML);
    }
}); 