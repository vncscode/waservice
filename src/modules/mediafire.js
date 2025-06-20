const axios = require('axios');
const cheerio = require('cheerio');

const mediafire = async (url) => {
  try {

    // indexamento ao Google
    
    const res = await axios.get(`https://www-mediafire-com.translate.goog/${url.replace('https://www.mediafire.com/', '')}?_x_tr_sl=en&_x_tr_tl=fr&_x_tr_hl=en&_x_tr_pto=wapp`);

    const $ = cheerio.load(res.data);

    const link = $('#downloadButton').attr('href');
    if (!link) throw new Error('Download link not found.');

    const filesizeText = $('#downloadButton').text();
    const filesize = filesizeText.includes('(') ? filesizeText.split('(')[1].split(')')[0] : 'Unknown';

    const filename = $('.dl-btn-label').text().split('\n')[1]?.trim() || 'Unknown file';
    const extension = url.trim().split('.').pop().split('/')[0];

    const status = 'true';

    let mimetype = '';
    const rese = await axios.head(link);
    mimetype = rese.headers['content-type'];

    return { status, link, filename, filesize, extension, mimetype };
  } catch (error) {
    console.error('Erro ao baixar, tente outro link:', error.message);
    return { status: 'false', error: error.message };
  }
};


module.exports = { mediafire };