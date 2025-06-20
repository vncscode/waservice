const axios = require('axios');

async function instaSearch(query) {
    try {
        const response = await axios.get(`https://api-bruxel4s.shop/api/download/instareel?query=${encodeURIComponent(query)}`);

        if (!response.data?.resultado || response.data.resultado.length === 0) {
            return { ok: false, msg: 'Nenhum Reel encontrado para esta pesquisa.' };
        }

        const videos = response.data.resultado.map(item => ({
            titulo: item.titulo || 'Sem título',
            autor: item.username || 'Autor desconhecido',
            estatisticas: {
                curtidas: item.likes || 0,
                comentarios: item.comentarios || 0,
                reproducoes: item.play_count || 0
            },
            midia: {
                duracao: item.video_info?.duration || 0,
                url_video: item.video_info?.url || '',
                thumbnail: item.video_info?.thumbnail || ''
            }
        }));

        return {
            ok: true,
            videos: videos
        };

    } catch (error) {
        console.error('Erro na instaSearch:', error.message);
        return { 
            ok: false, 
            msg: error.response?.data?.message || 'Erro ao conectar com o serviço de busca.' 
        };
    }
}

module.exports = { instaSearch };