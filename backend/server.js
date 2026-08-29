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

            const $ = cheerio.load(body);

            $('[src]').each((_, el) => {
                try {
                    const src = $(el).attr('src');
                    $(el).attr('src', new URL(src, targetUrl).href);
                } catch (e) {}
            });

            $('a[href]').each((_, el) => {
                try {
                    const href = $(el).attr('href');
                    const absoluteUrl = new URL(href, targetUrl).href;
                    $(el).attr('href', `${currentProxyServer}${encodeURIComponent(absoluteUrl)}`);
                } catch (e) {}
            });

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
