const { igdl } = require('ruhend-scraper');
const happyDL = require("./happy-dl/index.js");

async function instadl(url) {
    try {
        const res = await igdl(url);
        return res;
    } catch (error) {
        throw new Error(`Erro ao processar a URL: ${error.message}`);
    }
}


async function instadl2(url) {
    try {
        const res = await happyDL.instagramDownloader(url);
        return res;
    } catch (error) {
        throw new Error(`Erro ao processar a URL: ${error.message}`);
    }
}

async function instavid(url) {
    if (!url) throw new Error('URL do Instagram é necessária');
    try {
        const res = await igdl(url);
        return { video: res.data[0].url };
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}


module.exports = { instadl, instavid, instadl2 };