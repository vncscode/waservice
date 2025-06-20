const axios = require('axios');
const cheerio = require('cheerio');

async function AudioMeme(query) {
    try {
        const response = await axios.get(`https://www.myinstants.com/pt/search/?name=${query}`);
        const $ = cheerio.load(response.data);

        const results = [];

        $('.instant').each((index, element) => {
            const instant = $(element);
            const playButton = instant.find('button[onclick^="play("]');

            if (playButton.length) {
                const onclick = playButton.attr('onclick');
                const mp3Match = onclick.match(/play\('([^']+\.mp3)/);

                if (mp3Match && mp3Match[1]) {
                    results.push({
                        title: instant.find('.instant-link').text().trim(),
                        mp3Url: `https://www.myinstants.com${mp3Match[1]}`
                    });
                }
            }
        });

        $('button[onclick^="share("]').each((index, element) => {
            const onclick = $(element).attr('onclick');
            const shareMatch = onclick.match(/share\([^,]+, [^,]+, '([^']+\.mp3)/);

            if (shareMatch && shareMatch[1]) {
                const mp3Url = `https://www.myinstants.com${shareMatch[1]}`;

                if (!results.some(item => item.mp3Url === mp3Url)) {
                    const instant = $(element).closest('.instant');
                    results.push({
                        title: instant.length ? instant.find('.instant-link').text().trim() : 'Sem título',
                        mp3Url: mp3Url
                    });
                }
            }
        });
        return results.filter((item, index, self) =>
            index === self.findIndex(t => t.mp3Url === item.mp3Url)
        );
    } catch (error) {
        return [];
    }
}

module.exports = AudioMeme;