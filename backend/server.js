const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL is required');
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const body = await response.text();
        
        // レスポンスヘッダーを引き継ぎつつ、そのまま返す
        res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html');
        res.send(body);
    } catch (err) {
        res.status(500).send(`Proxy Error: ${err.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
