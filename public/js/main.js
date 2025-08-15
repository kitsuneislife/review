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
});
