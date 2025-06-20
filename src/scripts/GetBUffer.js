const axios = require('axios');

const getBuffer = async (url, opcoes = {}) => {
    try {
        const response = await axios({
            method: "get",
            url,
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36',
                'DNT': 1,
                'Upgrade-Insecure-Requests': 1
            },
            ...opcoes,
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    } catch (erro) {
        console.log(`Erro ao obter buffer: ${erro}`);
        return null;
    }
};

module.exports = getBuffer;