const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files under /pizza-order-demo/
app.use('/pizza-order-demo', express.static(__dirname));

// SPA fallback: serve index.html for routes under /pizza-order-demo/
app.get('/pizza-order-demo/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Redirect root to /pizza-order-demo/
app.get('/', (req, res) => {
  res.redirect('/pizza-order-demo/');
});

app.listen(PORT, () => {
  console.log(`Checkers Pizza demo running at http://localhost:${PORT}/pizza-order-demo/`);
});
