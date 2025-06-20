const axios = require('axios');
const cheerio = require("cheerio");
const qs = require('qs');
const FormData = require('form-data');

const EFFECTS_1TEXT = {
    darkgreen: "https://en.ephoto360.com/dark-green-typography-online-359.html",
    glitch: "https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html",
    write: "https://en.ephoto360.com/write-text-on-wet-glass-online-589.html",
    advancedglow: "https://en.ephoto360.com/advanced-glow-effects-74.html",
    typography: "https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html",
    pixelglitch: "https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html",
    neonglitch: "https://en.ephoto360.com/create-impressive-neon-glitch-text-effects-online-768.html",
    flag: "https://en.ephoto360.com/nigeria-3d-flag-text-effect-online-free-753.html",
    flag3d: "https://en.ephoto360.com/free-online-american-flag-3d-text-effect-generator-725.html",
    deleting: "https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html",
    blackpink: "https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html",
    glowing: "https://en.ephoto360.com/create-glowing-text-effects-online-706.html",
    underwater: "https://en.ephoto360.com/3d-underwater-text-effect-online-682.html",
    logomaker: "https://en.ephoto360.com/free-bear-logo-maker-online-673.html",
    cartoon: "https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html",
    papercut: "https://en.ephoto360.com/multicolor-3d-paper-cut-style-text-effect-658.html",
    watercolor: "https://en.ephoto360.com/create-a-watercolor-text-effect-online-655.html",
    affectclouds: "https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html",
    blackpinklogo: "https://en.ephoto360.com/create-blackpink-logo-online-free-607.html",
    gradient: "https://en.ephoto360.com/create-3d-gradient-text-effect-online-600.html",
    summerbeach: "https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html",
    luxurygold: "https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-594.html",
    multicoloredneon: "https://en.ephoto360.com/create-multicolored-neon-light-signatures-591.html",
    sandsummer: "https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html",
    galaxywallpaper: "https://en.ephoto360.com/create-galaxy-wallpaper-mobile-online-528.html",
    1917: "https://en.ephoto360.com/1917-style-text-effect-523.html",
    markingneon: "https://en.ephoto360.com/making-neon-light-text-effect-with-galaxy-style-521.html",
    royal: "https://en.ephoto360.com/royal-text-effect-online-free-471.html",
    freecreate: "https://en.ephoto360.com/free-create-a-3d-hologram-text-effect-441.html",
    galaxy: "https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html",
    lighteffects: "https://en.ephoto360.com/create-light-effects-green-neon-online-429.html",
    dragonball: "https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html",
    neondevil: "https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html",
    frozen: "https://en.ephoto360.com/create-a-frozen-christmas-text-effect-online-792.html",
    wooden3d: "https://en.ephoto360.com/wooden-3d-text-effect-59.html",
    metal3d: "https://en.ephoto360.com/text-metal-3d-277.html",
    ligatures: "https://en.ephoto360.com/ligatures-effects-from-leaves-146.html",
    '3druby': "https://en.ephoto360.com/3d-ruby-stone-text-281.html",
    sunset: "https://en.ephoto360.com/create-sunset-light-text-effects-online-807.html",
    hackerneon: "https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html",
    cemetery: "https://en.ephoto360.com/write-your-name-on-horror-cemetery-gate-597.html",
    halloween: "https://en.ephoto360.com/text-effect-halloween-online-79.html",
    horror: "https://en.ephoto360.com/writing-horror-letters-on-metal-plates-265.html",
    blood: "https://en.ephoto360.com/blood-writing-text-online-77.html",
    joker: "https://en.ephoto360.com/create-avatar-online-style-joker-365.html",
    clouds: "https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html",
    grafite: "https://en.ephoto360.com/graffiti-text-text-effect-online-178.html",
    grafite2: "https://en.ephoto360.com/graffiti-text-3-179.html",
    estrelas: "https://en.ephoto360.com/stars-night-online-84.html",
    colorido: "https://en.ephoto360.com/colorful-text-effects-93.html",
    desfoque: "https://en.ephoto360.com/bokeh-text-effect-86.html",
    zombie: "https://en.ephoto360.com/zombie-3d-text-effect-143.html",
    naruto: "https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html",
    aniversario: "https://en.ephoto360.com/colorful-birthday-foil-balloon-text-effects-620.html",
    amongus: "https://en.ephoto360.com/create-a-cover-image-for-the-game-among-us-online-762.html"
};

const EFFECTS_2TEXT = {
    pornhub: "https://en.ephoto360.com/create-pornhub-style-logos-online-free-549.html",
    blackpink: "https://en.ephoto360.com/create-blackpink-s-born-pink-album-logo-online-779.html",
    deadpool: "https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html",
    amongus: "https://en.ephoto360.com/create-a-banner-game-among-us-with-your-name-763.html",
    thor: "https://en.ephoto360.com/create-thor-logo-style-text-effects-online-for-free-796.html",
    neon: "https://en.ephoto360.com/neon-text-effect-online-78.html",
    stone3d: "https://en.ephoto360.com/create-3d-stone-text-effect-online-508.html",
    captainamerica: "https://en.ephoto360.com/create-a-cinematic-captain-america-text-effect-online-715.html",
    graffiti: "https://en.ephoto360.com/cute-girl-painting-graffiti-text-effect-667.html",
    avengers: "https://en.ephoto360.com/create-logo-3d-style-avengers-online-427.html",
    vintage: "https://en.ephoto360.com/create-realistic-vintage-3d-light-bulb-608.html",
    tiktok: "https://en.ephoto360.com/tik-tok-text-effects-online-generator-485.html",
    buoys: "https://en.ephoto360.com/write-letters-on-life-buoys-484.html",
    wood: "https://en.ephoto360.com/create-3d-wood-text-effects-online-free-705.html",
    space3d: "https://en.ephoto360.com/latest-space-3d-text-effect-online-559.html",
    wolf: "https://en.ephoto360.com/create-logo-avatar-wolf-galaxy-online-366.html",
    steel: "https://en.ephoto360.com/steel-text-effect-66.html",
    lattering: "https://en.ephoto360.com/heated-steel-lettering-effect-65.html"
};

/**
 * @param {string} effectName - Nome do efeito (ex: 'darkgreen')
 * @param {string} text - Texto para gerar a imagem
 * @returns {Promise<object>} Retorna um objeto com a URL da imagem no formato { image_1text: url }
 */
async function ephoto360_1text(effectName, text) {
    if (!EFFECTS_1TEXT[effectName]) {
        throw new Error(`Efeito '${effectName}' não encontrado. Efeitos disponíveis: ${Object.keys(EFFECTS_1TEXT).join(', ')}`);
    }

    if (!text || typeof text !== 'string') {
        throw new Error('O parâmetro "text" é obrigatório e deve ser uma string');
    }

    try {
        const url = EFFECTS_1TEXT[effectName];
        const imageUrl = await generateEphoto1Image(url, text);

        return {
            image_1text: imageUrl
        };

    } catch (error) {
        throw new Error(`Falha ao gerar imagem: ${error.message}`);
    }
}

/**
 * @param {string} url - URL do efeito no ephoto360
 * @param {string} text - Texto para gerar a imagem
 * @returns {Promise<string>} URL da imagem gerada
 */
async function generateEphoto1Image(url, text) {
    const form = new URLSearchParams();


    const gT = await axios.get(url, {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache"
        },
        timeout: 15000
    });

    const $ = cheerio.load(gT.data);
    const token = $("input[name=token]").val();
    const build_server = $("input[name=build_server]").val();
    const build_server_id = $("input[name=build_server_id]").val();

    if (!token || !build_server || !build_server_id) {
        throw new Error('Não foi possível obter os tokens necessários do ephoto360');
    }

    form.append("text[]", text);
    form.append("token", token);
    form.append("build_server", build_server);
    form.append("build_server_id", build_server_id);

    const res = await axios.post(url, form.toString(), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
            "cookie": gT.headers["set-cookie"]?.join("; "),
            "origin": "https://en.ephoto360.com",
            "referer": url
        },
        timeout: 15000
    });

    const $$ = cheerio.load(res.data);
    const formValueInput = $$("input[name=form_value_input]").val();

    if (!formValueInput) {
        throw new Error('Resposta inválida do ephoto360 - não encontrou form_value_input');
    }

    let json;
    try {
        json = JSON.parse(formValueInput);
    } catch (parseError) {
        throw new Error('Falha ao analisar JSON do ephoto360: ' + parseError.message);
    }

    json["text[]"] = json.text || text;
    delete json.text;

    const { data } = await axios.post(
        "https://en.ephoto360.com/effect/create-image",
        new URLSearchParams(json).toString(),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                "cookie": gT.headers["set-cookie"].join("; "),
                "origin": "https://en.ephoto360.com",
                "referer": url
            },
            timeout: 20000
        }
    );

    if (!data || !data.image) {
        throw new Error('Resposta inválida do ephoto360 - não contém URL da imagem');
    }

    return build_server + data.image;
}

/**
 * @param {string} effectName - Nome do efeito (ex: 'pornhub')
 * @param {string} textInput - Primeiro texto para gerar a imagem
 * @param {string} textInput2 - Segundo texto para gerar a imagem
 * @returns {Promise<object>} Retorna um objeto com a URL da imagem no formato { image_2text: url }
 */
async function ephoto360_2text(effectName, textInput, textInput2) {
    if (!EFFECTS_2TEXT[effectName]) {
        throw new Error(`Efeito '${effectName}' não encontrado. Efeitos disponíveis: ${Object.keys(EFFECTS_2TEXT).join(', ')}`);
    }

    const url = EFFECTS_2TEXT[effectName];
    let formData = new FormData();
    let initialResponse = await axios.get(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
        }
    });

    let $ = cheerio.load(initialResponse.data);

    let token = $('input[name=token]').val();
    let buildServer = $('input[name=build_server]').val();
    let buildServerId = $('input[name=build_server_id]').val();

    formData.append('text[]', textInput);
    formData.append('text[]', textInput2);
    formData.append('token', token);
    formData.append('build_server', buildServer);
    formData.append('build_server_id', buildServerId);

    let postResponse = await axios({
        url: url,
        method: 'POST',
        data: formData,
        headers: {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
            'cookie': initialResponse.headers['set-cookie']?.join(' '),
            ...formData.getHeaders()
        }
    });

    let $$ = cheerio.load(postResponse.data);
    let formValueInput = JSON.parse($$('input[name=form_value_input]').val());
    const body = qs.stringify(formValueInput, { arrayFormat: 'brackets' });

    const hasil = await axios.post('https://en.ephoto360.com/effect/create-image', body, {
        headers: {
            'accept': '*/*',
            'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            'cookie': initialResponse.headers["set-cookie"].join("; "),
            'Referer': url
        }
    });

    const imageUrl = buildServer + hasil.data.image;
    return {
        image_2text: imageUrl
    };
}

module.exports = {
    ephoto360_1text,
    ephoto360_2text,
    EFFECTS_1TEXT,
    EFFECTS_2TEXT
};
