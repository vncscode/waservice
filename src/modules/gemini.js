const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleGenAI, Modality } = require("@google/genai");
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('baileys');

const GOOGLE_GENAI_API_KEY = "AIzaSyB4USuFW8hjvAB5ayvkMLEX2ydcEVhNhes";
const NEXHUB_API_KEY = "nex_11bf9f57f3fd301574e69372e19296e4637719ac4642b31f7b0be91d5b71017b";

const dataAtual = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
});

var prompt = `Você é WaService, um assistente pessoal de atendimento via WhatsApp. Suas respostas devem ser curtas, diretas e objetivas. Não use emojis, não faça piadas e não tente parecer humano. Seja funcional e eficiente. Se o usuário mencionar Vncscode, apenas responda: “Vncscode é o criador e responsável pelo WaService.” — nunca imite, represente ou fale por ele. Caso não saiba algo, diga: “Essa informação será repassada ao responsável.” Seu foco é agilidade e clareza. Não invente, não enrole. Caso perguntando, data e hora atual ${dataAtual}, responda:`

async function getFileBuffer(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function geminiText(query) {
    const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const resultado = await model.generateContent(query);
    let resposta = resultado.response.text();
    return resposta
}

async function WaService(query) {
    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const resultado = await model.generateContent(prompt + query);
        let resposta = resultado.response.text();
        return resposta
    } catch (erro) {
        return "Essa informação será repassada ao responsável."
    }
}

async function GeminiImage(promptText) {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_GENAI_API_KEY });
    let uploadResult = null;

    try {
        const contents = [
            { text: promptText },
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-preview-image-generation",
            contents: contents,
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        let imageDataBuffer = null;
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
            } else if (part.inlineData) {
                const imageData = part.inlineData.data;
                imageDataBuffer = Buffer.from(imageData, "base64");
            }
        }

        if (imageDataBuffer) {
            const fileNameForUpload = `generated_image_${uuidv4()}.png`;
            const chunkSize = 8 * 1024 * 1024;
            const fileId = uuidv4();
            const totalChunks = Math.ceil(imageDataBuffer.length / chunkSize);

            for (let i = 0; i < totalChunks; i++) {
                const chunk = imageDataBuffer.slice(i * chunkSize, (i + 1) * chunkSize);
                const formData = new FormData();
                formData.append('fileId', fileId);
                formData.append('fileName', fileNameForUpload);
                formData.append('chunkIndex', i.toString());
                formData.append('totalChunks', totalChunks.toString());
                formData.append('chunk', chunk, { filename: fileNameForUpload, contentType: 'image/png' });
                formData.append('duration', '15d');

                try {
                    const axiosResponse = await axios.post('https://files.nexhub.fun/api/upload/apikey', formData, {
                        headers: {
                            'Authorization': 'Bearer ' + NEXHUB_API_KEY,
                            ...formData.getHeaders()
                        }
                    });

                    if (i === totalChunks - 1) {
                        uploadResult = axiosResponse.data.file;
                    }
                } catch (error) {
                    return {
                        success: false,
                        message: `Erro no upload da imagem: ${error.response?.data?.message || error.message}`,
                        imageMetadata: null
                    };
                }
            }
        } else {
            return {
                success: false,
                message: "Nenhuma imagem foi gerada pelo Gemini.",
                imageMetadata: null
            };
        }

        if (uploadResult) {
            return {
                success: true,
                message: "Imagem gerada e upload realizado com sucesso.",
                imageMetadata: {
                    fileSize: uploadResult.fileSize,
                    type: uploadResult.type,
                    fileName: uploadResult.fileName,
                    url: 'https://files.nexhub.fun' + uploadResult.url,
                    id: uploadResult.id
                }
            };
        } else {
            return {
                success: false,
                message: "A imagem foi gerada, mas o upload falhou ou não retornou dados esperados.",
                imageMetadata: null
            };
        }

    } catch (error) {
        return {
            success: false,
            message: `Erro ao processar a imagem: ${error.response?.data?.message || error.message}`,
            imageMetadata: null
        };
    }
}

async function GeminiEditImage(imageBuffer, promptText) {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_GENAI_API_KEY });
    let uploadResult = null;

    try {
        const contents = [
            { text: promptText },
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBuffer.toString("base64"),
                },
            },
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-preview-image-generation",
            contents: contents,
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        let imageDataBuffer = null;
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
            } else if (part.inlineData) {
                const imageData = part.inlineData.data;
                imageDataBuffer = Buffer.from(imageData, "base64");
            }
        }

        if (imageDataBuffer) {
            const fileNameForUpload = `edited_image_${uuidv4()}.png`;
            const chunkSize = 8 * 1024 * 1024;
            const fileId = uuidv4();
            const totalChunks = Math.ceil(imageDataBuffer.length / chunkSize);

            for (let i = 0; i < totalChunks; i++) {
                const chunk = imageDataBuffer.slice(i * chunkSize, (i + 1) * chunkSize);
                const formData = new FormData();
                formData.append('fileId', fileId);
                formData.append('fileName', fileNameForUpload);
                formData.append('chunkIndex', i.toString());
                formData.append('totalChunks', totalChunks.toString());
                formData.append('chunk', chunk, { filename: fileNameForUpload, contentType: 'image/png' });
                formData.append('duration', '15d');

                try {
                    const axiosResponse = await axios.post('https://files.nexhub.fun/api/upload/apikey', formData, {
                        headers: {
                            'Authorization': 'Bearer ' + NEXHUB_API_KEY,
                            ...formData.getHeaders()
                        }
                    });

                    if (i === totalChunks - 1) {
                        uploadResult = axiosResponse.data.file;
                    }
                } catch (error) {
                    return {
                        success: false,
                        message: `Erro no upload da imagem editada: ${error.response?.data?.message || error.message}`,
                        imageMetadata: null
                    };
                }
            }
        } else {
            return {
                success: false,
                message: "Nenhuma imagem foi gerada após a edição pelo Gemini.",
                imageMetadata: null
            };
        }

        if (uploadResult) {
            return {
                success: true,
                message: "Imagem editada e upload realizado com sucesso.",
                imageMetadata: {
                    fileSize: uploadResult.fileSize,
                    type: uploadResult.type,
                    fileName: uploadResult.fileName,
                    url: 'https://files.nexhub.fun' + uploadResult.url,
                    id: uploadResult.id
                }
            };
        } else {
            return {
                success: false,
                message: "A imagem foi editada, mas o upload falhou ou não retornou dados esperados.",
                imageMetadata: null
            };
        }

    } catch (error) {
        return {
            success: false,
            message: `Erro ao processar a edição da imagem: ${error.response?.data?.message || error.message}`,
            imageMetadata: null
        };
    }
}

module.exports = {
    geminiText,
    WaService,
    GeminiImage,
    GeminiEditImage,
    getFileBuffer
};