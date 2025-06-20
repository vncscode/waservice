const axios = require('axios'); 
const cheerio = require('cheerio');


async function kwaiDownload(url) {
try {
const response = await axios.get(url, {
headers: {
"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
}
});

const $ = cheerio.load(response.data);
const scriptTag = $('script#VideoObject');
if (!scriptTag.length) {
return { error: "deu erro" };
}

const videoData = JSON.parse(scriptTag.html());

return {
titulo: videoData.name,
descricao: videoData.description || "Sem descrição",
thumbnail: videoData.thumbnailUrl[0],
publicado: videoData.uploadDate,
video: videoData.contentUrl,
duracao: videoData.duration,
criador: {
nome: videoData.creator.mainEntity.name,
usuario: videoData.creator.mainEntity.alternateName,
perfil: videoData.creator.mainEntity.url
}
};
} catch (error) {
return { error: "Erro ao processar a página", detalhe: error.message };
}
};

module.exports = { kwaiDownload }