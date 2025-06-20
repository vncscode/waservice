const { search } = require('aptoide-api');


const AptoideSearch = async (appName, limit = 1) => {
  try {
    const apps = await search(appName, limit);
    const formattedApps = apps.map(app => ({
      name: app.name,
      package: app.package,
      size: app.size,
      version: app.version,
      downloads: app.downloads,
      rating: app.rating,
      icon: app.icon,
      downloadUrl: app.downloadUrl
    }));

    return formattedApps;
  } catch (error) {
    console.error('Erro ao buscar apps:', error);
    return [];
  }
};




module.exports = { AptoideSearch };
