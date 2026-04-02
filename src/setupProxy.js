const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/ords/iagami_ops',
    createProxyMiddleware({
      target: 'https://oracleapex.com/ords/iagami_ops',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/ords/iagami_ops': '',
      },
      logLevel: 'debug',
    })
  );
};
