const axios = require('axios');
const cheerio = require('cheerio');

const wikiSearch = async (query) => {
  try {
    const res = await axios.get(`https://pt.m.wikipedia.org/w/index.php?search=${query}`);
    const $ = cheerio.load(res.data);
    const resultado = [];

    const imagem = $('td img').attr('src');

    const imagemUrl = imagem ? 'https:' + imagem : '';

    const nome = $('p').find('b').first().text().trim();

    const desc = $('p').first().text().trim();

    resultado.push({ 
      nome: nome,
      imagem: imagemUrl, 
      desc: desc
    });

    return resultado;
  } catch (error) {
    return [];
  }
};

module.exports = { wikiSearch };
