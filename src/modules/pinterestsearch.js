const axios = require('axios');
const cheerio = require('cheerio');

async function pinterestSearch(query) {
  // Função interna para remover acentos
  const removerAcentos = (texto) => {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N');
  };

  try {
    const queryFormatada = removerAcentos(query);
    const url = `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(queryFormatada)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.152 Mobile Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const imagens = [];

    $('.hCL').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const imagemHD = src.replace(/236/g, '736').replace('60x60', '736x');
        imagens.push(imagemHD);
      }
    });

    if (imagens.length === 0) {
      return {
        ok: false,
        msg: 'Nenhuma imagem encontrada para esta pesquisa.'
      };
    }

    const randomImage = imagens[Math.floor(Math.random() * imagens.length)];
    
    return {
      ok: true,
      criador: 'Hiudy',
      type: 'image',
      mime: 'image/jpeg',
      url: randomImage,
      queryOriginal: query
    };

  } catch (err) {
    console.error('Erro no pinterestSearch:', err.message);
    return {
      ok: false,
      msg: 'Erro ao buscar no Pinterest. Tente novamente mais tarde.'
    };
  }
}

module.exports = { pinterestSearch };