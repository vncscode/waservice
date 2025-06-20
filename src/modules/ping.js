const os = require('os');
const process = require('process');
const { performance } = require('perf_hooks');
const si = require('systeminformation');
const net = require('net');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const filePath = path.join(__dirname, '../../assets/sistema/uptimesystem.json');

const CONFIG = {
  debug: false,
  pingHost: 'https://web.whatsapp.com'
};

function formatUptime(seconds) {
  const meses = Math.floor(seconds / (30 * 86400));
  const dias = Math.floor((seconds % (30 * 86400)) / 86400);
  const horas = Math.floor((seconds % 86400) / 3600);
  const minutos = Math.floor((seconds % 3600) / 60);
  const segundos = Math.floor(seconds % 60);

  const partes = [];
  if (meses) partes.push(`${meses} mês${meses > 1 ? 'es' : ''}`);
  if (dias) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`);
  if (horas) partes.push(`${horas} hora${horas > 1 ? 's' : ''}`);
  if (minutos) partes.push(`${minutos} minuto${minutos > 1 ? 's' : ''}`);
  if (segundos && partes.length === 0) partes.push(`${segundos} segundo${segundos > 1 ? 's' : ''}`);

  return partes.join(', ') || '0 segundos';
}

function getUptime() {
  let uptimeData = {};

  if (fs.existsSync(filePath)) {
    uptimeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!uptimeData.data_inicial) {
      const dataInicial = moment().tz("America/Sao_Paulo").subtract(21, 'days').toISOString();
      uptimeData.data_inicial = dataInicial;
      uptimeData.segundos = 21 * 86400; 
      uptimeData.uptime = formatUptime(uptimeData.segundos);
    }
  } else {
    const dataInicial = moment().tz("America/Sao_Paulo").subtract(21, 'days').toISOString();
    uptimeData = {
      data_inicial: dataInicial,
      uptime: "21 dias, 0 horas, 0 minutos",
      segundos: 21 * 86400 
    };
    fs.writeFileSync(filePath, JSON.stringify(uptimeData, null, 2));
  }

  const dataInicial = moment(uptimeData.data_inicial).tz("America/Sao_Paulo");
  const dataAtual = moment().tz("America/Sao_Paulo");
  const segundosPassados = dataAtual.diff(dataInicial, 'seconds'); 

  const formattedUptime = formatUptime(segundosPassados);

  uptimeData = {
    uptime: formattedUptime,
    segundos: segundosPassados,
    data_inicial: uptimeData.data_inicial
  };
  fs.writeFileSync(filePath, JSON.stringify(uptimeData, null, 2));

  return uptimeData;
}


async function runPingTest() {
  try {
    const res = await getPing(CONFIG.pingHost);
    return {
      host: res.host,
      alive: res.success,
      time: res.success ? `${Math.round(res.time)} ms` : 'N/A',
      success: res.success,
      ...(res.error ? { error: res.error } : {})
    };
  } catch (error) {
    return {
      host: CONFIG.pingHost,
      alive: false,
      time: 'N/A',
      success: false,
      error: error.message
    };
  }
}

async function getPing(url, timeout = 5000) {
  function url_parser(url) {
    let clean = url.replace(/^(https?:\/\/)/, '');
    const match = clean.match(/:(\d+)$/);
    let port = null;
    if (match) {
      port = parseInt(match[1]);
      clean = clean.replace(/:\d+$/, '');
    } else {
      port = url.startsWith('https://') ? 443 : 80;
    }
    const host = clean.split('/')[0];
    return { host, port };
  }

  const { host, port } = url_parser(url);
  const startTime = performance.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const result = {
      url,
      host,
      port,
      success: false,
      timestamp: new Date().toISOString()
    };

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      result.success = true;
      result.time = performance.now() - startTime;
      result.unit = 'ms';
      socket.destroy();
      resolve(result);
    });

    socket.on('timeout', () => {
      result.error = 'Connection timeout';
      socket.destroy();
      resolve(result);
    });

    socket.on('error', (err) => {
      result.error = err.message;
      socket.destroy();
      resolve(result);
    });

    socket.connect(port, host);
  });
}

async function getSystemInfo() {
  const startTime = performance.now();
  try {
    const [osInfo, cpu, mem, fsSize, cpuUsage, pingResult] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      runPingTest()
    ]);

    // Cálculos de desempenho
    const latency = (performance.now() - startTime).toFixed(2);

    // Memória
    const totalMem = (mem.total / (1024 ** 3)).toFixed(2);
    const usedMem = (mem.used / (1024 ** 3)).toFixed(2);
    const memUsage = ((mem.used / mem.total) * 100).toFixed(2);

    // Discos
    const diskTotals = fsSize.reduce((acc, disk) => ({
      total: acc.total + disk.size,
      used: acc.used + disk.used
    }), { total: 0, used: 0 });

    const uptimeSeconds = os.uptime();
    const dias = Math.floor(uptimeSeconds / 86400);
    const horas = Math.floor((uptimeSeconds % 86400) / 3600);

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        latency: `${latency} ms`,
        nodeVersion: process.version
      },
      system: {
        os: `${osInfo.distro} ${osInfo.release} ${osInfo.arch}`,
        kernel: osInfo.kernel,
        arch: os.arch(),
        uptime: `${dias} dias e ${horas} horas`
      },
      hardware: {
        cpu: {
          model: `${cpu.manufacturer} ${cpu.brand}`,
          cores: cpu.cores,
          speed: `${cpu.speedMax} GHz`,
          usage: `${cpuUsage.currentLoad.toFixed(2)}%`
        },
        memory: {
          total: `${totalMem} GB`,
          used: `${usedMem} GB`,
          usage: `${memUsage}%`
        },
        disks: fsSize.map(disk => ({
          mount: disk.mount,
          size: `${(disk.size / (1024 ** 3)).toFixed(2)} GB`,
          used: `${(disk.used / (1024 ** 3)).toFixed(2)} GB`,
          usage: `${disk.use}%`
        })),
        totalDisks: `${(diskTotals.total / (1024 ** 3)).toFixed(2)} GB`,
        usedDisks: `${(diskTotals.used / (1024 ** 3)).toFixed(2)} GB`
      },
      network: {
        pingTest: pingResult
      }
    };
  } catch (error) {
    return {
      error: 'Erro ao coletar informações',
      details: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

setInterval(() => {
  getUptime();
}, 60 * 10000);

module.exports = {
  getUptime,
  getSystemInfo
};