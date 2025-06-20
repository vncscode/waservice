const axios = require('axios');

const apicuttly = ['2d7d52eaab79cc69f7f6881b80c2fd8022e1f', '4786cc6a0f19de9c67ea6a4282c494323c932', '2038c1a7754b408aa8f9055282638c00e668e', '89d73b3a07209177d0251e30d49d66bd669ac', 'e841147455d0fdfbf50f74aefe63b6728adc0', '27f3aa3f45cb4460bcbac69b782ca470a4570', '31a8df09d5a9d8d009790df0b5642e3d76919', '09b4e764ff07b10eac1682e71aaf95a78f358', '75fe576ce040b619176af22f5a718b2f574f5', 'e24ee36f9c1519c0a779667a5182a31fb7ccf', '903869065d29e23455ddca922071f4bbeb133'];
const apibitly = ['6cfc18e9bfa554714fadc10a1f6aff7555642348', '2243940c230ad0d748059aee58ddf126b65fd8e7', 'c71b6658a1d271ddaf2a5077de3dcb9d67f68025', 'cddbceccdc2f1c9d11e4cdd0d2b1d1078e447c43', '7915c671fbd90eca96310e5c9442d761225a1080', 'e5dee46eb2d69fc9f4b0057266226a52a3555356', 'f09ab8db9cf778b37a1cf8bc406eee5063816dec', '964080579f959c0cc3226b4b2053cd6520bb60ad', 'a4f429289bf8bf6291be4b1661df57dde5066525', '3d48e2601f25800f375ba388c30266aad54544ae', '4854cb9fbad67724a2ef9c27a9d1a4e9ded62faa', 'd375cf1fafb3dc17e711870524ef4589995c4f69', '43f58e789d57247b2cf285d7d24ab755ba383a28', '971f6c6c2efe6cb5d278b4164acef11c5f21b637', 'ae128b3094c96bf5fd1a349e7ac03113e21d82c9', 'e65f2948f584ffd4c568bf248705eee2714abdd2', '08425cf957368db9136484145aa6771e1171e232', 'dc4bec42a64749b0f23f1a8f525a69184227e301', '0f9eb729a7a08ff5e73fe1860c6dc587cc523035', '037c5017712c8f5f154ebbe6f91db1f82793c375'];

async function tinyUrl(url) {
  const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
  return { service: 'TinyURL', shortUrl: response.data };
}

async function cuttly(url) {
  const key = apicuttly[Math.floor(Math.random() * apicuttly.length)];
  const response = await axios.get('https://cutt.ly/api/api.php', { params: { key, short: url } });
  return { service: 'Cuttly', shortUrl: response.data.url.shortLink };
}

async function bitly(url) {
  const key = apibitly[Math.floor(Math.random() * apibitly.length)];
  const response = await axios.post('https://api-ssl.bitly.com/v4/shorten',
    { long_url: url },
    { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } }
  );
  return { service: 'Bitly', shortUrl: response.data.link };
}

async function isgd(url) {
  const response = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
  if (response.data.startsWith('http')) {
    return { service: 'is.gd', shortUrl: response.data.trim() };
  }
  const match = response.data.match(/(https?:\/\/[^\s<>"']+)/i);
  if (match && match[0]) {
    return { service: 'is.gd', shortUrl: match[0] };
  }
  throw new Error('Formato de resposta inesperado do is.gd');
}

async function shortenAll(url) {
  const results = [];
  
  try {
    const tiny = await tinyUrl(url);
    results.push({ id: 0, ...tiny });
  } catch (error) {
    results.push({ id: 0, service: 'TinyURL', error: error.message });
  }
  
  try {
    const cut = await cuttly(url);
    results.push({ id: 1, ...cut });
  } catch (error) {
    results.push({ id: 1, service: 'Cuttly', error: error.message });
  }
  
  try {
    const bit = await bitly(url);
    results.push({ id: 2, ...bit });
  } catch (error) {
    results.push({ id: 2, service: 'Bitly', error: error.message });
  }
  
  try {
    const isg = await isgd(url);
    results.push({ id: 3, ...isg });
  } catch (error) {
    results.push({ id: 3, service: 'Is.gd', error: error.message });
  }
  
  return results;
}

module.exports = shortenAll;