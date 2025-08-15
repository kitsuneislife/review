
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".component-album-container").forEach(album => {
        album.addEventListener("mouseover", () => {
            const mobileAlbum = album.querySelector(".component-album-display");
            if (mobileAlbum) mobileAlbum.classList.add("component-album-supershadow");
        });
        album.addEventListener("mouseout", () => {
            const mobileAlbum = album.querySelector(".component-album-display");
            if (mobileAlbum) mobileAlbum.classList.remove("component-album-supershadow");
        });
    });

    // SPA simples para navegação
    document.querySelectorAll('.app-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/?pageView=')) {
                e.preventDefault();
                fetch(href, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(resp => resp.text())
                    .then(html => {
                        // Extrai o conteúdo do <main> e do breadcrumb
                        const temp = document.createElement('div');
                        temp.innerHTML = html;
                        const newMain = temp.querySelector('.app-main');
                        const newNavline = temp.querySelector('.app-navline');
                        if (newMain) {
                            document.querySelector('.app-main').innerHTML = newMain.innerHTML;
                        }
                        if (newNavline) {
                            document.querySelector('.app-navline').innerHTML = newNavline.innerHTML;
                        }
                        window.history.pushState({}, '', href);
                    });
            }
        });
    });

});