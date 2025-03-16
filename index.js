const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the Dynamic API key via an endpoint
app.get('/api/config', (req, res) => {
    res.json({
        dynamicApiKey: process.env.DYNAMIC_API_KEY
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
