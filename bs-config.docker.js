module.exports = {
  proxy: 'http://localhost:3009',
  files: 'public/**',
  port: 3008,
  open: false,
  host: '0.0.0.0',
  watchOptions: {
    usePolling: true,
    interval: 500,
  },
};
