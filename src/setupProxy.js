const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {

  // Oracle APEX
  app.use(
    '/ords/iagami_ops',
    createProxyMiddleware({
      target: 'https://oracleapex.com',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
    })
  );

  // AI Gateway (fix for mixed content)
  app.use(
    '/ai',
    createProxyMiddleware({
      target: 'http://aigateway.iagami.com:4000',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/ai': '',
      },
      logLevel: 'debug',
    })
  );
};