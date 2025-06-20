const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');


const DIRECTORY = '../../assets/conn';
const DELETION_RATIOS = {
  prekeys: 0.4,  // 40% dos arquivos pre-key serão apagados
  sessions: 0.8   // 80% dos arquivos de sessão serão apagados
};

async function limparArquivos() {
  try {
    try {
      await fs.access(DIRECTORY);
    } catch (error) {
      return `Diretório ${DIRECTORY} não encontrado.`;
    }

    const todosArquivos = await listarArquivosJson();
    
    const prekeys = await ordenarPorData(todosArquivos.filter(f => f.startsWith('pre-key-')));
    const sessions = await ordenarPorData(todosArquivos.filter(f => f.startsWith('session-')));
    const senderKeys = todosArquivos.filter(f => f.startsWith('sender-key-'));


    const qtdPreKeysApagar = Math.floor(prekeys.length * DELETION_RATIOS.prekeys);
    const qtdSessionsApagar = Math.floor(sessions.length * DELETION_RATIOS.sessions);

    const contagem = {
      prekeys: { apagados: 0, totais: prekeys.length },
      sessions: { apagados: 0, totais: sessions.length },
      senderKeys: { apagados: 0, totais: senderKeys.length }
    };

    for (const file of prekeys.slice(0, qtdPreKeysApagar)) {
      if (await apagarArquivo(file)) {
        contagem.prekeys.apagados++;
      }
    }

    for (const sessionFile of sessions.slice(0, qtdSessionsApagar)) {
      if (await apagarArquivo(sessionFile)) {
        contagem.sessions.apagados++;
      }


      const match = sessionFile.match(/^session-(\d+)/);
      if (match) {
        const numero = match[1];
        const relatedSenderKeys = senderKeys.filter(sk => sk.includes(`--${numero}--`));
        
        for (const sk of relatedSenderKeys) {
          if (await apagarArquivo(sk)) {
            contagem.senderKeys.apagados++;
          }
        }
      }
    }

    return gerarRelatorio(contagem);
  } catch (error) {
    return `Erro ao limpar arquivos: ${error.message}`;
  }
}


async function listarArquivosJson() {
  try {
    const arquivos = await fs.readdir(DIRECTORY);
    return arquivos.filter(file => file.endsWith('.json'));
  } catch (error) {
    return [];
  }
}

async function ordenarPorData(arquivos) {
  try {
    const arquivosComStats = await Promise.all(
      arquivos.map(async (arquivo) => {
        const stats = await fs.stat(path.join(DIRECTORY, arquivo));
        return { arquivo, mtimeMs: stats.mtimeMs };
      })
    );
    
    return arquivosComStats
      .sort((a, b) => a.mtimeMs - b.mtimeMs)
      .map(item => item.arquivo);
  } catch (error) {
    return arquivos; 
  }
}

async function apagarArquivo(nome) {
  try {
    await fs.unlink(path.join(DIRECTORY, nome));
    return true;
  } catch (error) {
    return false;
  }
}

function gerarRelatorio(contagem) {
  const linhas = [];
  linhas.push(`Data: ${new Date().toLocaleString()}`);
  
  for (const [tipo, dados] of Object.entries(contagem)) {
    const { apagados, totais } = dados;
    const restantes = totais - apagados;

    const pctApagado = calcularPorcentagem(apagados, totais);
    const pctRestante = calcularPorcentagem(restantes, totais);

    linhas.push(`\n• ${tipo.toUpperCase()}`);
    linhas.push(` - Apagados: ${apagados} arquivos (${pctApagado}%)`);
    linhas.push(` - Restantes: ${restantes} arquivos (${pctRestante}%)`);
  }
  
  return linhas.join('\n');
}

function calcularPorcentagem(parte, total) {
  if (total === 0) return '0.0';
  return ((parte / total) * 100).toFixed(1);
}

function iniciarCronLimpeza(callback) {
  const job = cron.schedule('0 */4 * * *', async () => {
    const relatorio = await limparArquivos();
    
    if (callback && typeof callback === 'function') {
      callback(relatorio);
    } else {
      console.log(relatorio);
    }
  });
  
  return job; 
}


module.exports = {
  limparArquivos,
  iniciarCronLimpeza
};