const axios = require('axios');
const cheerio = require('cheerio');

async function bingImageSearch(query) {
    try {
        const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
        const { data: html } = await axios.get(bingUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const $ = cheerio.load(html);
        const results = [];

        $('a.iusc').each((_, el) => {
            const meta = $(el).attr('m');
            try {
                const obj = JSON.parse(meta);
                if (obj && obj.murl) results.push(obj.murl);
            } catch (err) {
            }
        });

        if (!results.length) throw new Error('Nenhuma imagem encontrada.');
        return results;
    } catch (error) {
        throw new Error(`Erro ao buscar imagens: ${error.message}`);
    }
}


module.exports = bingImageSearch;
