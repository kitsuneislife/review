
const express = require('express');
const path = require('path');
const http = require('http');
require('dotenv').config();

const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { param, validationResult } = require('express-validator');
const expressLayouts = require('express-ejs-layouts');

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
    capa_url: '/images/ram-cover.jpg', // Usando uma imagem local
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
// --- FIM DOS DADOS MOCK ---


const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet());

/*const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Muitas requisições deste IP, por favor tente novamente em 15 minutos.',
});

app.use(limiter);*/
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home Page',
    reviews: mockReviews
  });
});

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
