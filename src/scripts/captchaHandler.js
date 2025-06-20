const fs = require('fs');
const path = require('path');

const captchaTrue = path.resolve(__dirname, '../../assets/grupos/captcha.json');
const captchaGroup = path.resolve(__dirname, '../../assets/grupos/confs.json');

function isCaptchaAtivo(grupoId) {
    if (!fs.existsSync(captchaGroup)) return false;

    const dados = fs.readFileSync(captchaGroup, 'utf-8');
    const estrutura = JSON.parse(dados);

    return estrutura[grupoId]?.captcha === true;
}


function atualizarCaptcha(grupoId, usuarioId, status) {
    let estrutura = {};

    if (fs.existsSync(captchaTrue)) {
        const dados = fs.readFileSync(captchaTrue, 'utf-8');
        estrutura = JSON.parse(dados);
    }

    if (!estrutura[grupoId]) {
        estrutura[grupoId] = {};
    }

    estrutura[grupoId][usuarioId] = {
        captcha: {
            ativo: status
        }
    };

    fs.writeFileSync(captchaTrue, JSON.stringify(estrutura, null, 4), 'utf-8');
}

function addCaptchaTrue(grupoId, usuarioId) {
    atualizarCaptcha(grupoId, usuarioId, true);
}

function addCaptchaFalse(grupoId, usuarioId) {
    atualizarCaptcha(grupoId, usuarioId, false);
}

module.exports = {
    isCaptchaAtivo,
    addCaptchaTrue,
    addCaptchaFalse
};
