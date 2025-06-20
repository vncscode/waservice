const axios = require('axios');
const cheerio = require('cheerio');

async function Stalkig(user) {
  try {
    const endpoint = 'https://privatephotoviewer.com/wp-json/instagram-viewer/v1/fetch-profile';
    const payload = { find: user };
    const headers = {
      'Content-Type': 'application/json',
      'Accept': '/',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://privatephotoviewer.com/',
    };
    const { data } = await axios.post(endpoint, payload, { headers });
    const html = data.html;
    const $ = cheerio.load(html);
    
    let fotoPerfil = $('#profile-insta').find('.col-md-4 img').attr('src');
    if (fotoPerfil && fotoPerfil.startsWith('//')) {
      fotoPerfil = 'https:' + fotoPerfil;
    }
    
    const nome = $('#profile-insta').find('.col-md-8 h4.text-muted').text().trim();
    const usuarioNome = $('#profile-insta').find('.col-md-8 h5.text-muted').text().trim();
    
    const estatisticas = {};
    $('#profile-insta')
      .find('.col-md-8 .d-flex.justify-content-between.my-3 > div')
      .each((i, el) => {
        const valorEstatistica = $(el).find('strong').text().trim();
        const etiquetaEstatistica = $(el).find('span.text-muted').text().trim().toLowerCase();
        if (etiquetaEstatistica.includes('posts')) {
          estatisticas.posts = valorEstatistica;
        } else if (etiquetaEstatistica.includes('followers')) {
          estatisticas.seguidores = valorEstatistica;
        } else if (etiquetaEstatistica.includes('following')) {
          estatisticas.seguindo = valorEstatistica;
        }
      });
    
    const bio = $('#profile-insta').find('.col-md-8 p').text().trim();
    
    return {
      foto: fotoPerfil || RANDOM_BOT_LOGO,
      nome,
      usuario: usuarioNome,
      estatisticas,
      bio
    };
    
  } catch (error) {
    return null;
  }
}

module.exports = Stalkig;