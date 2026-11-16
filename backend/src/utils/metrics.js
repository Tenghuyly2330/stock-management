const client = require('prom-client');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'stock-management-backend',
});

// Enable the collection of default metrics (CPU, Memory, Event Loop)
client.collectDefaultMetrics({ register });

// Custom Metric 1: HTTP Request Duration Histogram
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDurationSeconds);

// Custom Metric 2: Total HTTP Requests Counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests made to the API',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

// Custom Metric 3: Active Transactions Gauge
const activeInventoryTransactions = new client.Gauge({
  name: 'active_inventory_transactions',
  help: 'Number of active in-flight inventory transactions',
});
register.registerMetric(activeInventoryTransactions);

module.exports = {
  register,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  activeInventoryTransactions,
};
