const axios = require('axios');

const translate = async ({ text, targetLang = 'en', sourceLang }) => {
  try {
    const response = await axios.post('https://translategg.vncs.pro/api/v1/translate', {
      text,
      targetLang,
      ...(sourceLang && { sourceLang })
    }, {
      timeout: 10000 // 10 segundos de timeout
    });

    if (!response.data?.translatedText) {
      throw new Error('Resposta inválida da API');
    }

    return response.data.translatedText;
  } catch (error) {
    console.error('Erro na tradução:', error.message);
    return null;
  }
};

module.exports = translate;