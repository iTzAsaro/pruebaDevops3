// Servidor Principal del Microservicio Backend - Plataforma VI CITY
// Responsable: Alexsander Rosales (Backend Developer)
// Proyecto: DOY0101 Ingeniería DevOps

const http = require('node:http');
const config = require('./config/constants');
const { handleCors } = require('./middleware/cors');
const { observe, serveMetrics } = require('./observability/metrics');
const Router = require('./router');

// Controladores
const catalogController = require('./controllers/catalogController');
const ordersController = require('./controllers/ordersController');

const router = new Router();

// Rutas del Catálogo y Estado
router.get('/api/health', catalogController.getHealth);
router.get('/api/catalog', catalogController.getCatalog);
router.get('/api/platforms', catalogController.getPlatforms);
router.get('/api/editions', catalogController.getEditions);
router.get('/api/items', catalogController.getItems);
router.post('/api/items', catalogController.createItem);

// Rutas de Gestión de Preventas / Órdenes
router.get('/api/orders', ordersController.getOrders);
router.get('/api/orders/:id', ordersController.getOrderById);
router.post('/api/orders', ordersController.createOrder);
router.patch('/api/orders/:id/cancel', ordersController.cancelOrder);
router.delete('/api/orders/:id', ordersController.deleteOrder);
router.get('/api/metrics', ordersController.getMetrics);

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  const isMetrics = pathname === '/metrics' && req.method === 'GET';
  const probe = isMetrics || pathname === '/api/health';
  observe(req, res, () => probe ? pathname : req.routePattern || (req.method === 'OPTIONS' ? 'preflight' : 'unmatched'), !probe);

  if (handleCors(req, res)) return;
  if (isMetrics) return serveMetrics(res);

  await router.handle(req, res);
});

if (require.main === module) {
  const { log, monitorFatalErrors } = require('./observability/logger');
  monitorFatalErrors();
  server.listen(config.PORT, () => log('INFO', 'HTTP server listening', { port: server.address().port }));
}

module.exports = server;
