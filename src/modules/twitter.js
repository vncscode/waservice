const axios = require('axios');
const cheerio = require('cheerio');

async function twitterDl(link) {
  try {
    const token = await axios.post('https://x2twitter.com/api/userverify', null, {
      params: { url: link }
    });

    const data = new URLSearchParams({
      q: link,
      lang: 'en',
      cftoken: token.data.token
    }).toString();

    const html = await axios.post('https://x2twitter.com/api/ajaxSearch', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const $ = cheerio.load(html.data.data);
    const result = {};

    if ($('.tw-video').length > 0) {
      result.type = 'video';
      result.title = $('.clearfix h3').text().trim();
      result.duration = $('.clearfix p').text().trim();
      result.thumbnail = $('.image-tw img').attr('src');
      result.download = [];

      $('.dl-action a').each((_, el) => {
        const quality = $(el).text().trim();
        if (quality.includes('Download MP4')) {
          result.download.push({
            link: $(el).attr('href'),
            quality
          });
        }
      });
    } else if ($('.video-data').length > 0 || $('.download-items__thumb img').length > 0) {
      result.type = 'photo';
      result.thumb = $('.download-items__thumb img').attr('src');
      result.download = $('.download-items__btn a').attr('href');
    }

    return result;
  } catch (err) {
    return null;
  }
}

module.exports = twitterDl;
