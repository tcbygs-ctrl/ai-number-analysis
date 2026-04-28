const { app, initData } = require('./app');
const os = require('os');

const PORT = process.env.PORT || 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`🚀 Server running at:`);
  console.log(`   Local   → http://localhost:${PORT}`);
  console.log(`   Network → http://${ip}:${PORT}`);
  initData();
});
