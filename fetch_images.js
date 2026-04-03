import https from 'https';

https.get('https://shimaneparesources.wordpress.com/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const matches = data.match(/src="([^"]+)"/g);
    if (matches) {
      matches.forEach(m => {
        if (m.includes('.jpg') || m.includes('.png') || m.includes('.gif')) {
          console.log(m);
        }
      });
    }
  });
});
