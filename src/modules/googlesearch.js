const gis = require('g-i-s');
const https = require('https');
const axios = require('axios');

// Create axios instance that ignores SSL errors
const insecureAxios = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

module.exports = {
    /**
     * Search for images on Google Images
     * @param {string} query - Search term
     * @returns {Promise<Array<{url: string, width: number, height: number}>>} - Array of image results
     */
    search: function(query) {
        return new Promise((resolve, reject) => {
            gis(query, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    // Filter out invalid results
                    const filteredResults = results
                        .filter(result => result.url)
                        .map(({ url, width, height }) => ({ 
                            url, 
                            width, 
                            height 
                        }));
                    resolve(filteredResults);
                }
            });
        });
    },

    /**
     * Downloads image with SSL verification disabled
     * @param {string} url - Image URL
     * @returns {Promise<Stream>} Image stream
     */
    downloadImage: async function(url) {
        try {
            const response = await insecureAxios.get(url, {
                responseType: 'stream'
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to download image: ${error.message}`);
        }
    },

    /**
     * Formats image results into a readable string
     */
    formatResults: function(results, count = 5) {
        if (!results || results.length === 0) return "Nenhum resultado encontrado";
        
        return results.slice(0, count)
            .map((result, index) => (
                `*${index + 1}.* ${this.shortenUrl(result.url)}\n` +
                `   ➤ Dimensões: ${result.width || '?'}x${result.height || '?'}\n`
            )).join('\n');
    },

    /**
     * Shortens long URLs for display
     */
    shortenUrl: function(url) {
        if (url.length > 50) {
            return url.substring(0, 47) + '...';
        }
        return url;
    }
};