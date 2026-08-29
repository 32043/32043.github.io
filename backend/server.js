const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');

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
            const currentProxyServer = `${req.protocol}://${req.get('host')}/proxy?url=`;

            // CheerioでHTMLをパース
            const $ = cheerio.load(body);

            // 1. すべての画像やCSS、JSなどの src や href を絶対URLに変換
            $('[src]').each((_, el) => {
                try {
                    const src = $(el).attr('src');
                    $(el).attr('src', new URL(src, targetUrl).href);
                } catch (e) {}
            });

            // 2. リンク (href) はプロキシ経由のURLに変換
            $('a[href]').each((_, el) => {
                try {
                    const href = $(el).attr('href');
                    const absoluteUrl = new URL(href, targetUrl).href;
                    $(el).attr('href', `${currentProxyServer}${encodeURIComponent(absoluteUrl)}`);
                } catch (e) {}
            });

            // その他のlinkタグ（CSSなど）のhrefも絶対URLに変換
            $('link[href]').each((_, el) => {
                try {
                    const href = $(el).attr('href');
                    $(el).attr('href', new URL(href, targetUrl).href);
                } catch (e) {}
            });

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send($.html());
        }

        res.setHeader('Content-Type', contentType);
        res.send(body);

    } catch (err) {
        res.status(500).send(`Proxy Error: ${err.message}`);
    }
});

app.get('/search-api', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).send('Query is required');
    }

    try {
        const searxngUrl = `https://searx.tiekoetter.com/search?q=${encodeURIComponent(query)}&format=json`;
        
        const response = await fetch(searxngUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Searxng responded with status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
