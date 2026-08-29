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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const contentType = response.headers.get('content-type') || '';
        const body = await response.text();

        if (contentType.includes('text/html')) {
            const parsedTarget = new URL(targetUrl);
            const targetOrigin = parsedTarget.origin;
            const currentProxyServer = `${req.protocol}://${req.get('host')}/proxy?url=`;

            let modifiedBody = body;

            // 1. 絶対パス (/で始まるもの) を元のサイトの絶対URLに置換
            modifiedBody = modifiedBody.replace(/(href|src|action)="\/(?!\/)/g, `$1="${targetOrigin}/`);

            // 2. ページ内のすべてのリンクやアクションをプロキシ経由に書き換える
            // 例: href="https://ja.wikipedia.org/..." -> href="https://your-render.onrender.com/proxy?url=https%3A%2F%2Fja.wikipedia.org%2F..."
            modifiedBody = modifiedBody.replace(/(href|action)="(https?:\/\/[^"]+)"/g, (match, attr, url) => {
                return `${attr}="${currentProxyServer}${encodeURIComponent(url)}"`;
            });

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(modifiedBody);
        }

        res.setHeader('Content-Type', contentType);
        res.send(body);

    } catch (err) {
        res.status(500).send(`Proxy Error: ${err.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
