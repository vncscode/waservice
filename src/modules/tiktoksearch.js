const axios = require('axios');

async function tiktokSearch(query) {
    return new Promise(async (resolve) => {
        try {
            const response = await axios({
                method: 'POST',
                url: 'https://tikwm.com/api/feed/search',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Cookie': 'current_language=pt-BR',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
                },
                data: new URLSearchParams({
                    keywords: query,
                    count: 5,
                    cursor: 0,
                    HD: 1
                }).toString()
            });

            const videos = response.data.data?.videos;

            if (!videos || videos.length === 0) {
                resolve({ ok: false, msg: 'Não encontrei nenhum vídeo.' });
            } else {
                const randomIndex = Math.floor(Math.random() * videos.length);
                const randomVideo = videos[randomIndex];

                resolve({
                    ok: true,
                    criador: 'Hiudy',
                    titulo: randomVideo.title,
                    video: randomVideo.play,
                    type: 'video',
                    mime: 'video/mp4',
                    audio: randomVideo.music
                });
            }
        } catch (error) {
            console.error(error);
            resolve({ ok: false, msg: 'Ocorreu um erro ao buscar vídeos.' });
        }
    });
}

module.exports = { tiktokSearch };