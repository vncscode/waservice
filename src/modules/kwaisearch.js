const axios = require('axios')

async function kwaiSearch(query) {
    const payload = {
        count: 10,
        fromUser: false,
        pcursor: '14',
        searchWord: query,
        tabName: ''
    };

    try {
        const { data } = await axios.post('https://www.kwai.com/rest/o/w/pc/feed/search', payload);

        const feeds = data?.feeds ?? [];
        if (feeds.length) {
            return { data: feeds };
        }
        return { error: 'Nenhum resultado encontrado' };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = {
    kwaiSearch
}