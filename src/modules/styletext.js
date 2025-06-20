const axios = require('axios');
const cheerio = require('cheerio');

async function styletext(query) {
  return new Promise((resolve, reject) => {
    axios.get('http://qaz.wtf/u/convert.cgi?text=' + encodeURIComponent(query))
      .then(({ data }) => {
        const $ = cheerio.load(data);
        const resultado = [];

        $('table > tbody > tr').each((_, elem) => {
          resultado.push({
            fonte: $(elem).find('td:nth-child(1) > span').text(),
            nome: $(elem).find('td:nth-child(2)').text().trim()
          });
        });

        resolve(resultado);
      })
      .catch(reject);
  });
}

module.exports = styletext;
