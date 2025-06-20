const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Busca papéis de parede no site besthdwallpaper.com baseado no título.
 * @param {string} title - Termo de busca.
 * @param {string|number} [page='1'] - Página a buscar.
 * @returns {Promise<Array>} Lista de papéis de parede.
 */
function wallpaper(title, page = '1') {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${encodeURIComponent(title)}`)
      .then(({ data }) => {
        const $ = cheerio.load(data);
        const results = [];

        $('div.grid-item').each((_, el) => {
          const link = $(el).find('a').attr('href');
          const image = $(el).find('picture > source').first().attr('srcset');
          const titleFromAlt = $(el).find('img').attr('alt');

          if (link && image) {
            results.push({
              title: titleFromAlt || '',
              source: 'https://www.besthdwallpaper.com' + link,
              image
            });
          }
        });

        resolve(results);
      })
      .catch(reject);
  });
}

module.exports = wallpaper;
