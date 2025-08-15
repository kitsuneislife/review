
// =========================
// IMPORTS E CONFIGS INICIAIS
// =========================
const express = require('express');
const path = require('path');
const http = require('http');
require('dotenv').config();
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { param, validationResult } = require('express-validator');
const expressLayouts = require('express-ejs-layouts');

// =========================
// MOCK DE DADOS
// =========================
const mockReviews = [
  {
    slug: 'daft-punk-ram',
    titulo_review: 'Uma Ode Robótica à Era Disco',
    conteudo_html: `
      <div style="font-family: sans-serif; padding: 2rem;">
        <h1>Análise: Random Access Memories</h1>
        <p>Este é o conteúdo da review para o álbum do Daft Punk. É uma obra-prima moderna.</p>
        <img src="/images/ram-cover.jpg" alt="Capa do Random Access Memories" style="max-width: 100%; border-radius: 8px;">
      </div>
    `,
    nota: 9.5,
    custom_css: 'body { background-color: #f0f0f0; color: #333; }',
    custom_html_head: '',
    publicado_em: new Date('2023-05-20T18:00:00Z'),
    album_titulo: 'Random Access Memories',
    capa_url: '/images/ram-cover.jpg',
    ano_lancamento: 2013,
    artista_nome: 'Daft Punk',
  },
  {
    slug: 'fleetwood-mac-rumours',
    titulo_review: 'A Tensão que Gerou um Clássico',
    conteudo_html: `
      <div style="font-family: serif; padding: 2rem; background: #faf3e0;">
        <h1>Análise: Rumours</h1>
        <p>Poucos álbuns capturam o drama humano como Rumours. Cada faixa é uma história.</p>
        <img src="https://placehold.co/600x600/EEDC82/000000?text=Rumours" alt="Capa do Rumours" style="max-width: 100%; border-radius: 8px;">
      </div>
    `,
    nota: 10.0,
    custom_css: 'body { background-color: #faf3e0; color: #5c4033; }',
    custom_html_head: '<meta name="description" content="Review de Rumours">',
    publicado_em: new Date('2023-04-15T12:00:00Z'),
    album_titulo: 'Rumours',
    capa_url: 'https://placehold.co/400x400/EEDC82/000000?text=Rumours',
    ano_lancamento: 1977,
    artista_nome: 'Fleetwood Mac',
  }
];

// =========================
// APP E MIDDLEWARES
// =========================
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
// Helmet com CSP customizado para permitir imagens externas via HTTPS (ex: Spotify CDN, placehold.co)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      // permitir imagens locais, data URIs e recursos HTTPS externos (spotify CDN, placehold, etc.)
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: []
    }
  }
}));
// const limiter = rateLimit({ ... }); // Descomente se quiser limitar requisições
// app.use(limiter);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// ROTAS PRINCIPAIS
// =========================
app.get('/', async (req, res) => {
  const pageView = req.query.pageView || 'index';
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';

  if (pageView === 'search') {
    // If query present, perform server-side search (Spotify) and pass albums/artists to the view
    const q = (req.query.q || '').trim();
    const type = (req.query.type || 'album,artist');
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 40);

    let albums = [];
    let artists = [];
    let tracks = [];

    if (q) {
      try {
        // try using server token helper
        const token = await getSpotifyToken();
        const params = new URLSearchParams({ q, type, limit: String(limit) });
        const r = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await r.json();
        albums = (json.albums && json.albums.items) || [];
        artists = (json.artists && json.artists.items) || [];
        tracks = (json.tracks && json.tracks.items) || [];
      } catch (err) {
        // If token missing or Spotify fails, fallback to empty arrays (error logged by error handler)
        console.error('Server-side Spotify search failed:', err && err.message);
        albums = [];
        artists = [];
        tracks = [];
      }
    }

    if (isAjax) {
      return res.render('search', {
        title: 'Busca',
        pageView,
        albums,
        artists,
        q,
        type,
        tracks
      });
    }

    return res.render('layout', {
      title: 'Busca',
      pageView,
      albums,
      artists,
      q,
      type,
      tracks
    });
  }

  // Outras páginas podem ser tratadas aqui
  if (isAjax) {
    return res.render('index', {
      title: 'Home Page',
      pageView,
      reviews: mockReviews
    });
  }
  return res.render('layout', {
    title: 'Home Page',
    pageView,
    reviews: mockReviews
  });
});

// =========================
// ROTAS DE REVIEW
// =========================
const reviewValidationRules = [
  param('slug').trim().isSlug().withMessage('O formato do slug é inválido.').escape()
];

app.get('/reviews/:slug', reviewValidationRules, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Dados de entrada inválidos.');
    error.status = 400;
    error.details = errors.array();
    return next(error);
  }
  const { slug } = req.params;
  const foundReview = mockReviews.find(review => review.slug === slug);
  if (!foundReview) {
    const error = new Error('Review não encontrada');
    error.status = 404;
    return next(error);
  }
  res.render('review', {
    title: foundReview.titulo_review,
    review: foundReview
  });
});

// =========================
// ERROS E 404
// =========================
// =========================
// Spotify Search API (server-side, Client Credentials)
// =========================
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
let _spotify_token = null;
let _spotify_token_expires_at = 0;

async function getSpotifyToken() {
  if (!_spotify_token || Date.now() >= _spotify_token_expires_at) {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      const err = new Error('Spotify credentials not configured (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).');
      err.status = 500;
      throw err;
    }
    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => null);
      const e = new Error('Failed to obtain Spotify token: ' + resp.status + ' ' + (text || ''));
      e.status = 502;
      throw e;
    }
    const data = await resp.json();
    _spotify_token = data.access_token;
    _spotify_token_expires_at = Date.now() + (data.expires_in - 60) * 1000; // renew 60s early
  }
  return _spotify_token;
}

// Lightweight per-route rate limiter to protect Spotify usage
const searchLimiter = rateLimit({
  windowMs: 15 * 1000, // 15s window
  max: 8, // max 8 requests per 15s per IP
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/spotify/search', searchLimiter, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'missing query parameter q' });
    const type = (req.query.type || 'album').split(',').map(s => s.trim()).filter(Boolean).join(',');
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 40);

    const token = await getSpotifyToken();
    const params = new URLSearchParams({ q, type, limit: String(limit) });
    const r = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.status === 401) {
      // token might have expired; force refresh once
      _spotify_token = null;
      const token2 = await getSpotifyToken();
      const r2 = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      const json2 = await r2.json();
      return res.json(json2);
    }
    const json = await r.json();
    return res.json(json);
  } catch (err) {
    next(err);
  }
});

app.use((req, res, next) => {
  const error = new Error('Página Não Encontrada');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  if (statusCode >= 500) {
    console.error(`[ERRO ${statusCode}]`, error.stack);
  }
  res.status(statusCode);
  res.render('error', {
    title: `Erro ${statusCode}`,
    message: statusCode === 404 ? 'Página Não Encontrada' : 'Ocorreu um erro no servidor',
    error: process.env.NODE_ENV === 'development' ? error : {},
  });
});

// =========================
// INICIALIZAÇÃO DO SERVIDOR
// =========================
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Servidor rodando com DADOS MOCK na porta http://localhost:${PORT}`);
});

const gracefulShutdown = (signal) => {
  console.log(`\nRecebido sinal ${signal}. Encerrando o servidor...`);
  server.close(() => {
    console.log('Servidor HTTP encerrado.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
