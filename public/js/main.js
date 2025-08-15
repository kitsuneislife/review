// public/js/main.js — comportamentos cliente (hover, SPA) e busca progressiva.

function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>\"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' })[s]);
}

function renderSearchResults(container, data) {
  container.innerHTML = '';
  const artists = (data && data.artists && data.artists.items) || data.artists || [];
  const albums = (data && data.albums && data.albums.items) || data.albums || [];

  if (artists.length) {
    const h = document.createElement('h3');
    h.className = 'app-section-subtitle';
    h.textContent = 'Artistas';
    container.appendChild(h);
    // criar rows com no máximo 4 componentes por fileira
    const chunkSize = 4;
    for (let i = 0; i < artists.length; i += chunkSize) {
      const chunk = artists.slice(i, i + chunkSize);
      const row = document.createElement('div');
      row.className = 'app-section-result-row app-section-search-result-row';
      chunk.forEach(art => {
        const comp = document.createElement('div');
        comp.className = 'app-component app-component-album';
        const disp = document.createElement('div');
        disp.className = 'app-component-display';
        const imgUrl = (art.images && art.images[0] && art.images[0].url) || '/assets/general/cat.png';
        const img = document.createElement('img');
        img.className = 'app-component-artist-image';
        img.src = imgUrl;
        disp.appendChild(img);
        const micWrap = document.createElement('div');
        micWrap.className = 'app-component-artist-microphone';
        const micImg = document.createElement('img');
        micImg.className = 'app-component-artist-microphone-image';
        micImg.src = '/assets/general/microphone.png';
        micWrap.appendChild(micImg);
        disp.appendChild(micWrap);
        comp.appendChild(disp);
        const title = document.createElement('span');
        title.className = 'app-component-album-title';
        title.textContent = art.name;
        comp.appendChild(title);
        row.appendChild(comp);
      });
      container.appendChild(row);
    }
  }

  if (albums.length) {
    const h = document.createElement('h3');
    h.className = 'app-section-subtitle';
    h.textContent = 'Álbuns';
    container.appendChild(h);
    // criar rows com no máximo 4 componentes por fileira
    const chunkSize = 4;
    for (let i = 0; i < albums.length; i += chunkSize) {
      const chunk = albums.slice(i, i + chunkSize);
      const row = document.createElement('div');
      row.className = 'app-section-result-row app-section-search-result-row';
      chunk.forEach(alb => {
        const comp = document.createElement('div');
        comp.className = 'app-component app-component-album';
        const disp = document.createElement('div');
        disp.className = 'app-component-display';
        const imgUrl = (alb.images && alb.images[0] && alb.images[0].url) || '/assets/general/cd.png';
        const img = document.createElement('img');
        img.className = 'app-component-album-cover';
        img.src = imgUrl;
        disp.appendChild(img);
        const vinyl = document.createElement('div');
        vinyl.className = 'app-component-album-vinyl';
        const vinylImg = document.createElement('img');
        vinylImg.className = 'app-component-album-vinyl-image';
        vinylImg.src = '/assets/general/vinyl.png';
        vinyl.appendChild(vinylImg);
        disp.appendChild(vinyl);
        comp.appendChild(disp);
        const title = document.createElement('span');
        title.className = 'app-component-album-title';
        title.textContent = alb.name;
        comp.appendChild(title);
        const artistSpan = document.createElement('span');
        artistSpan.className = 'app-component-album-artist';
        const artistsNames = (alb.artists || []).map(a => a.name).join(', ');
        artistSpan.textContent = artistsNames;
        comp.appendChild(artistSpan);
        row.appendChild(comp);
      });
      container.appendChild(row);
    }
  }

  if (!artists.length && !albums.length) {
    container.innerHTML = '<span class="app-section-no-result">Nenhum resultado encontrado</span>';
  }
}

function bindInteractions() {
  // Hover: adicionar/remover 'app-component-supershadow' ao filho '.app-component-display'
  // Aplica a componentes: artista, álbum e faixa; previne handlers duplicados em rebinds
  function attachHover(el) {
    if (!el) return;
    const display = el.querySelector('.app-component-display');
    if (!display) return;
    // remover handlers antigos se existirem (evita duplicação em rebind)
    if (el.__hoverHandlers__) {
      el.removeEventListener('mouseover', el.__hoverHandlers__.add);
      el.removeEventListener('mouseout', el.__hoverHandlers__.remove);
    }
    const add = () => display.classList.add('app-component-supershadow');
    const remove = () => display.classList.remove('app-component-supershadow');
    el.addEventListener('mouseover', add);
    el.addEventListener('mouseout', remove);
    el.__hoverHandlers__ = { add, remove };
  }

  // bind inicial para componentes já presentes
  document.querySelectorAll('.app-component.app-component-artist, .app-component.app-component-album, .app-component.app-component-track').forEach(attachHover);

  // Observe dinamicamente a adição de novos componentes para bind automático
  if (!window.__app_component_observer__) {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          // se o nó adicionado for um componente ou contiver componentes
          if (node.matches && node.matches('.app-component.app-component-artist, .app-component.app-component-album, .app-component.app-component-track')) {
            attachHover(node);
          } else {
            node.querySelectorAll && node.querySelectorAll('.app-component.app-component-artist, .app-component.app-component-album, .app-component.app-component-track').forEach(attachHover);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__app_component_observer__ = observer;
  }

  // Busca progressiva (cliente)
  const input = document.querySelector('.app-section-search-input');
  const resultsContainer = document.querySelector('.app-section-search-results');
  const select = document.querySelector('.app-section-search-select');
  if (input && resultsContainer) {
  // input bound for progressive search
    const doSearch = debounce(async (q, selectedType) => {
  // performing search
      if (!q) { resultsContainer.innerHTML = '<span class="app-section-no-result">Digite para buscar</span>'; return; }
      try {
        resultsContainer.innerHTML = '<span class="app-section-no-result">Buscando...</span>';
  const typeParam = encodeURIComponent(selectedType || (select && select.value) || 'album,artist');
  const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&type=${typeParam}&limit=12`);
  if (!res.ok) throw new Error('search_failed');
  const json = await res.json();
        renderSearchResults(resultsContainer, json);
      } catch (err) {
        console.error('Search error', err);
        resultsContainer.innerHTML = '<span class="app-section-no-result">Erro ao buscar</span>';
      }
    }, 300);

    input.removeEventListener('input', input.__searchHandler__);
    input.__searchHandler__ = (e) => {
      const q = e.target.value.trim();
      if (!q) { resultsContainer.innerHTML = '<span class="app-section-no-result">Digite para buscar</span>'; return; }
      doSearch(q);
    };
    input.addEventListener('input', input.__searchHandler__);
    // quando o select mudar, refazer a busca atual
    if (select) {
      select.addEventListener('change', function() {
        const q = (input.value || '').trim();
        if (!q) return;
        doSearch(q, select.value);
      });
    }
  }
}

// SPA nav with rebind
document.addEventListener("DOMContentLoaded", () => {
  bindInteractions();

  document.querySelectorAll('.app-nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/?pageView=')) {
        e.preventDefault();
        fetch(href, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
          .then(resp => resp.text())
          .then(html => {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const newMain = temp.querySelector('.app-main');
            const newNavline = temp.querySelector('.app-navline');
            if (newMain) document.querySelector('.app-main').innerHTML = newMain.innerHTML;
            if (newNavline) document.querySelector('.app-navline').innerHTML = newNavline.innerHTML;
            window.history.pushState({}, '', href);
            // rebind interactions for newly injected content
            bindInteractions();
          })
          .catch(() => { /* fail silently */ });
      }
    });
  });

});