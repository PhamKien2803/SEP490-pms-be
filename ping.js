const { createClient } = require('redis');

(async () => {
  const client = createClient({
    url: 'rediss://default:QHwByg2d5XSQ0Ishh7ulfw3RFOB6PMZS@redis-11057.c282.east-us-mz.azure.redns.redis-cloud.com:11057',
    socket: {
      tls: true
    }
  });

  client.on('error', err => console.error('❌ Redis lỗi:', err));
  client.on('ready', () => console.log('✅ Redis sẵn sàng'));

  await client.connect();
  const info = await client.info('server');
  console.log(info);
})();
