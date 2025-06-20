const path = require('path');

const IMAGES = Array.from({ length: 26 }, (_, i) =>
  path.join(__dirname, 'imagens', `midia_${i + 1}.jpeg`)
);

const VIDEOS = Array.from({ length: 7 }, (_, i) =>
  path.join(__dirname, 'videos', `midia_${i + 1}.mp4`)
);

const RANDOM_BOT_LOGO = IMAGES[Math.floor(Math.random() * IMAGES.length)];
const RANDOM_BOT_LOGO_VIDEO = VIDEOS[Math.floor(Math.random() * VIDEOS.length)];

global.RANDOM_BOT_LOGO = RANDOM_BOT_LOGO;
global.RANDOM_BOT_LOGO_VIDEO = RANDOM_BOT_LOGO_VIDEO;

module.exports = {
  RANDOM_BOT_LOGO,
  RANDOM_BOT_LOGO_VIDEO
};
