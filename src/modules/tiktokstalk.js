const axios = require('axios');
const cheerio = require('cheerio');

async function tiktok_stalk(username) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Referer': 'https://www.google.com/'
        };

        const url = `https://urlebird.com/pt/user/${username}/`;
        const response = await axios.get(url, { headers, timeout: 10000 }); // Aumentei o timeout
        const $ = cheerio.load(response.data);

        const statsContainer = $('.stats-header .row');
        const stats = {
            curtidas: statsContainer.find('.col-3:nth-child(1) b').text().trim(),
            seguidores: statsContainer.find('.col-3:nth-child(2) b').text().trim(),
            seguindo: statsContainer.find('.col-3:nth-child(3) b').text().trim(),
            videos: statsContainer.find('.col-3:nth-child(4) b').text().trim()
        };

        const metricsContainer = $('#collapse2');
        const metrics = {
            videos_mes: metricsContainer.find('li:contains("Vídeos por mês") span').text().trim(),
            engajamento_video: metricsContainer.find('li:contains("Engajamento por vídeo") span').first().text().trim(),
            engajamento_seguidores: metricsContainer.find('li:contains("Engajamento dos seguidores") span').first().text().trim(),
            lucro_video: metricsContainer.find('li:contains("Lucro estimado por vídeo") span').text().trim(),
            lucro_mensal: metricsContainer.find('li:contains("Lucro mensal estimado") span').text().trim(),
            lucro_anual: metricsContainer.find('li:contains("Lucro anual estimado") span').text().trim(),
            views_media: metricsContainer.find('li:contains("Visualizações médias por vídeo") span').text().trim(),
            likes_media: metricsContainer.find('li:contains("Curtidas médias por vídeo") span').text().trim(),
            comentarios_media: metricsContainer.find('li:contains("Comentários médios por vídeo") span').text().trim(),
            shares_media: metricsContainer.find('li:contains("Compartilhamentos médios por vídeo") span').text().trim()
        };

        return {
            nome: $('h1').text().trim(),
            username: $('h2').text().trim(),
            avatar: $('.u-image').attr('src'),
            estatisticas: stats,
            metricas: metrics,
            descricao: metricsContainer.find('p').text().trim()
        };

    } catch (error) {
        throw new Error("Falha ao buscar informações do perfil.");
    }
}

module.exports = {
    tiktok_stalk 
}