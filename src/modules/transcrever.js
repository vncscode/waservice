const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const mime = require('mime-types');

const baseHeadersAspose = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3',
};

async function transcribeAsposeAudio(audioUrl, fileName = 'audio.mp3') {
    if (!audioUrl?.match(/^https?:\/\//)) {
        throw new Error('URL de áudio inválida ou não fornecida');
    }

    try {
        // 1. Obter token CSRF
        const { data } = await axios.get('https://products.aspose.ai/total/pt/speech-to-text/mp3', {
            headers: baseHeadersAspose
        });
        
        const token = cheerio.load(data)('input[name="__RequestVerificationToken"]').attr('value');
        if (!token) throw new Error('Token não encontrado');

        // 2. Preparar o formulário
        const formData = new FormData();
        formData.append('__RequestVerificationToken', token);

        // 3. Baixar o áudio
        const { data: audioData } = await axios.get(audioUrl, {
            responseType: 'arraybuffer'
        });
        
        formData.append('UploadedFile', Buffer.from(audioData), {
            filename: fileName,
            contentType: mime.lookup(fileName) || 'audio/mpeg'
        });

        // 4. Enviar para a API do Aspose
        const { data: result } = await axios.post(
            'https://api.aspose.ai/total/speech-to-text/Home/UploadDocument',
            formData,
            {
                headers: {
                    ...baseHeadersAspose,
                    ...formData.getHeaders()
                }
            }
        );

        return {
            success: true,
            transcription: result,
            audioUrl: audioUrl,
            fileName: fileName
        };
    } catch (error) {
        console.error('Erro na transcrição:', error.message);
        return {
            success: false,
            error: error.message,
            details: error.response?.data || null
        };
    }
}



module.exports = transcribeAsposeAudio;