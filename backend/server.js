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

        // HTMLの場合のみ、相対パスを絶対パスに置換してCSSや画像が読み込めるようにする
        if (contentType.includes('text/html')) {
            const parsedTarget = new URL(targetUrl);
            const targetOrigin = parsedTarget.origin;
            const targetBasePath = targetOrigin + parsedTarget.pathname.substring(0, parsedTarget.pathname.lastIndexOf('/') + 1);

            let modifiedBody = body;

            // 1. / で始まるルート相対パス (例: /w/load.php) を targetOrigin + パス に置換
            modifiedBody = modifiedBody.replace(/(href|src|action)="\/(?!\/)/g, `$1="${targetOrigin}/`);
            
            // 2. ./ またはパスなしの相対パス (例: style.css, ./img/a.png) の簡易対応
            // ※完全に網羅するのは難しいため、主要なアセット読み込みをベースに絶対パス化

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(modifiedBody);
        }

        // HTML以外のファイル（CSSや画像など）はそのままスルーして返す
        res.setHeader('Content-Type', contentType);
        res.send(body);

    } catch (err) {
        res.status(500).send(`Proxy Error: ${err.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
