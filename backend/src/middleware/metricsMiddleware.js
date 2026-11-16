const { httpRequestDurationSeconds, httpRequestsTotal } = require('../utils/metrics');

const metricsMiddleware = (req, res, next) => {
  // Ignore Prometheus scraping endpoint itself from metrics to avoid skewing
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    
    // Normalize path to prevent high cardinality (e.g. replace IDs with :id)
    const route = req.baseUrl + (req.route?.path || req.path);
    const normalizedRoute = route.replace(/\/\d+/g, '/:id');

    const labels = {
      method: req.method,
      route: normalizedRoute || req.path,
      status_code: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationInSeconds);
  });

  next();
};

module.exports = metricsMiddleware;
