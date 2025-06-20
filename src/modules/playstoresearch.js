const axios = require('axios');
const cheerio = require('cheerio');
const linkfy = require('linkifyjs');

function removerAcentos(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function playStoreSearch(query) {
    try {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid search query');
        }

        const cleanQuery = encodeURIComponent(removerAcentos(query.trim()));
        const url = `https://play.google.com/store/search?q=${cleanQuery}&c=apps`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });

        if (response.status !== 200) {
            throw new Error('Failed to fetch Play Store data');
        }

        const $ = cheerio.load(response.data);
        const apps = [];

        $('.VfPpkd-aGsRMb').each((i, element) => {
            const $element = $(element);


            const name = $element.find('.DdYX5:first').text().trim();
            if (!name) return;

            let imageUrl = '';
            const $img = $element.find('img:first');
            const srcset = $img.attr('srcset');
            if (srcset) {
                const links = linkfy.find(srcset);
                imageUrl = links.pop()?.href || $img.attr('src') || '';
            } else {
                imageUrl = $img.attr('src') || '';
            }

            // Extract developer
            const developer = $element.find('.wMUdtb:first').text().trim();

            // Extract rating
            const rating = $element.find('.w2kbF:first').text().trim();

            // Extract app link
            const relativeLink = $element.find('a:first').attr('href');
            const link = relativeLink ? `https://play.google.com${relativeLink}` : '';

            apps.push({
                name,
                imageUrl: imageUrl.trim(),
                developer,
                rating: rating || 'Not rated',
                link,
                query: query // Include original search query
            });
        });

        if (apps.length === 0) {
            return {
                ok: false,
                msg: 'No apps found for your search',
                query
            };
        }

        return {
            ok: true,
            data: apps,
            count: apps.length,
            query
        };

    } catch (error) {
        console.error('Play Store search error:', error.message);
        return {
            ok: false,
            msg: error.response?.status === 404
                ? 'Play Store not available'
                : 'Error searching Play Store',
            query
        };
    }
}


module.exports = { playStoreSearch };