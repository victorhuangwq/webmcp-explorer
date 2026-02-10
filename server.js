const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Checkers Pizza demo running at http://localhost:${PORT}`);
});
