const { fbdl } = require('ruhend-scraper');

async function facebookdl(url) {
  try {
    const response = await fbdl(url);

    if (!response || !response.status || !Array.isArray(response.data)) {
      throw new Error("Respuesta inválida de fbdl");
    }

    const hdVideo = response.data[0];
    if (!hdVideo || !hdVideo.url) {
      throw new Error("No se encontró URL del video");
    }

    return { 
      video: hdVideo.url,
      thumbnail: hdVideo.thumbnail,
      resolution: hdVideo.resolution
    };
  } catch (error) {
    console.error('Error en facebookdl:', error.message);
    throw error;
  }
}


module.exports = { facebookdl };