const tiktokdl = require('@faouzkk/tiktok-dl');

async function tiktokDL(url) {
    try {
        if (!url) throw new Error('URL do TikTok é obrigatória');
        
        const result = await tiktokdl(url);
        return result;
        
    } catch (error) {
        throw new Error(`Erro ao baixar do TikTok: ${error.message}`);
    }
}

module.exports = tiktokDL;