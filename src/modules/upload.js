const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const apiKey = 'nex_11bf9f57f3fd301574e69372e19296e4637719ac4642b31f7b0be91d5b71017b';

async function uploadFile(filePath, duration = 'never') {
  const file = fs.readFileSync(filePath);
  const fileName = filePath.split('/').pop();
  const chunkSize = 8 * 1024 * 1024;
  const fileId = uuidv4();
  const totalChunks = Math.ceil(file.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('fileName', fileName);
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunk', chunk, { filename: fileName });
    formData.append('duration', duration);

    try {
      const response = await axios.post('https://files.nexhub.fun/api/upload/apikey', formData, {
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          ...formData.getHeaders()
        }
      });

      if (i === totalChunks - 1) {
        return response.data;
      }
    } catch (error) {
      console.error('Erro no upload:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = uploadFile;