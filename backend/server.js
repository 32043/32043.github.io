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

            // 1. 画像やCSSなどの src や href のうち、ルート相対パス (/...) のものを絶対パスに修正
            modifiedBody = modifiedBody.replace(/(src|href)="\/(?!\/)/g, `$1="${targetOrigin}/`);

            // 2. リンク (href) のみ、プロキシ経由のURLに書き換える（データリンクやアンカー等は除外）
            modifiedBody = modifiedBody.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
                // すでにプロキシ済みのものや特殊なリンクはそのまま
                if (url.includes('onrender.com')) return match;
                return `href="${currentProxyServer}${encodeURIComponent(url)}"`;
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
