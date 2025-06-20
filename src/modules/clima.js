const axios = require('axios');

async function getWeatherReport(city) {
    const response = await axios.get(`https://pt.wttr.in/${encodeURIComponent(city)}?format=j1`);
    let weather = response.data;
    const current = weather.current_condition[0];
    const location = weather.nearest_area[0];
    const forecast = weather.weather;

    const currentDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const currentCondition = current.lang_pt?.[0]?.value || current.weatherDesc?.[0]?.value || 'Desconhecido';

    let report = `*Relatório Meteorológico - ${location.areaName[0].value}, ${location.country[0].value}*\n\n`;
    report += `*Data Atual:* ${currentDate}\n`;
    report += `*Hora Local:* ${current.localObsDateTime.split(' ')[1]} ${current.localObsDateTime.split(' ')[2]}\n\n`;
    report += `*Condição Atual:*\n`;
    report += `- Temperatura: ${current.temp_C}°C (${current.temp_F}°F)\n`;
    report += `- Sensação Térmica: ${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)\n`;
    report += `- Umidade: ${current.humidity}%\n`;
    report += `- Condição do Tempo: ${currentCondition}\n`;
    report += `- Velocidade do Vento: ${current.windspeedKmph} km/h (${current.winddir16Point})\n`;
    report += `- Pressão Atmosférica: ${current.pressure} hPa\n`;
    report += `- Visibilidade: ${current.visibility} km\n`;
    report += `- Índice UV: ${current.uvIndex}\n\n`;

    report += `*Previsão para os Próximos Dias:*\n\n`;

    forecast.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'numeric'
        });

        report += `• ${date}:\n`;
        report += `- *Temperatura Mínima/Máxima:* ${day.mintempC}°C (${day.mintempF}°F) / ${day.maxtempC}°C (${day.maxtempF}°F)\n\n`;
        report += `- *Condições:*\n`;

        const morning = day.hourly.find(h => h.time === "600");
        const afternoon = day.hourly.find(h => h.time === "1200" || h.time === "1500");
        const evening = day.hourly.find(h => h.time === "1800" || h.time === "2100");

        if (morning) {
            report += `- Manhã: ${morning.lang_pt?.[0]?.value || morning.weatherDesc?.[0]?.value}, temperatura em torno de ${morning.tempC}°C.\n`;
        }
        if (afternoon) {
            report += `- Tarde: ${afternoon.lang_pt?.[0]?.value || afternoon.weatherDesc?.[0]?.value}, temperatura atingindo ${afternoon.tempC}°C.\n`;
        }
        if (evening) {
            report += `- Noite: ${evening.lang_pt?.[0]?.value || evening.weatherDesc?.[0]?.value}, temperatura em torno de ${evening.tempC}°C.\n`;
        }

        report += `- *Nascer do Sol:* ${day.astronomy[0].sunrise}\n`;
        report += `- *Pôr do Sol:* ${day.astronomy[0].sunset}\n\n`;
    });

    report += `*Resumo:*\n`;
    report += `Os próximos dias em ${location.areaName[0].value} serão predominantemente ${forecast[0].hourly.find(h => h.time === "1200").lang_pt?.[0]?.value.toLowerCase() || 'variados'}, `;
    report += `com temperaturas variando entre ${forecast.reduce((min, day) => Math.min(min, parseInt(day.mintempC)), 100)}°C `;
    report += `e ${forecast.reduce((max, day) => Math.max(max, parseInt(day.maxtempC)), 0)}°C. `;

    return report;
}

module.exports = getWeatherReport;
