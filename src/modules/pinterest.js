const axios = require("axios");
const cheerio = require("cheerio");

async function pinterestDL(url) {
	try {
		const response = await axios.get(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
			},
		});

		const $ = cheerio.load(response.data);
		let tag = $('script[data-test-id="video-snippet"]');

		if (tag.length > 0) {
			let result = JSON.parse(tag.text());
			if (!result || !result.name || !result.thumbnailUrl || !result.uploadDate || !result.creator) {
				return { msg: "Dados não encontrados, tente outro URL." };
			}

			return {
				titulo: result.name,
				thumb: result.thumbnailUrl,
				upload: new Intl.DateTimeFormat("pt-BR", {
					ano: "numeric",
					mes: "long",
					dia: "numeric",
					hora: "numeric",
					minuto: "numeric",
					segundo: "numeric",
				}).format(new Date(result.uploadDate)),
				source: result["@id"],
				autor: {
					nome: result.creator.alternateName || "Desconhecido",
					usuario: "@" + (result.creator.name || "Desconhecido"),
					url: result.creator.url || "",
				},
				keyword: result.keywords ? result.keywords.split(", ").map((k) => k.trim()) : [],
				download: result.contentUrl || "",
			};
		} else {
			let jsonText = $("script[data-relay-response='true']").eq(0).text();
			if (!jsonText) {
				return { msg: "Não foi possível extrair os dados do Pinterest." };
			}

			let json = JSON.parse(jsonText);
			let result = json.response?.data?.["v3GetPinQuery"]?.data;
			if (!result) {
				return { msg: "Erro ao obter dados do pin." };
			}

			return {
				titulo: result.title || "Sem título",
				upload: new Intl.DateTimeFormat("en-US", {
					ano: "numeric",
					mes: "long",
					dia: "numeric",
					hora: "numeric",
					minuto: "numeric",
					segundo: "numeric",
				}).format(new Date(result.createAt)),
				source: result.link || url,
				autor: {
					nome: result.pinner?.username || "Desconhecido",
					username: "@" + (result.pinner?.username || "Desconhecido"),
				},
				keyword: result.pinJoin?.visualAnnotation || [],
				download: result.imageLargeUrl || "",
			};
		}
	} catch (e) {
		return { msg: "Erro, tente novamente mais tarde." };
	}
}


module.exports = pinterestDL;
