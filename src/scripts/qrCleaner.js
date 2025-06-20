const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { logger, Config } = require("../constants");

const DIRECTORY = path.join(__dirname, '../../assets/conn');
const LIMITE_ARQUIVOS = 3500;
const DELETION_RATIOS = {
    prekeys: 0.7,
    sessions: 0.8
};

let watcher = null;

async function iniciarMonitoramento(sock, numeroDono) {
    if (watcher) {
        logger.log(`(Monitoramento de arquivos QR já está ativo.)gb(blue50, purple50)`);
        return watcher;
    }

    try {
        const arquivos = await listarArquivosJson();
        if (arquivos.length >= LIMITE_ARQUIVOS) {
            const relatorio = await limparArquivos();
            await sock.sendMessage(numeroDono, {
                text: `Limpeza acionada na inicialização - Pasta com ${arquivos.length} arquivos:\n\n${relatorio}`
            });

        }
    } catch (error) {
        logger.log(`(${Config.get("name")}: Erro ao verificar arquivos iniciais: ${error})gb(red50, yellow50)`);
    }

    watcher = chokidar.watch(DIRECTORY, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('add', async (filePath) => {
        try {
            const arquivos = await listarArquivosJson();
            if (arquivos.length >= LIMITE_ARQUIVOS) {
                const relatorio = await limparArquivos();
                const textoi = `${Config.get("name")}: Cleaner de Conexão Acionado.\n• Folder Antigiu: ${arquivos.length} Arquivos.\n\n${relatorio}`

                await sock.sendMessage(
                    numeroDono,
                    {
                        image: { url: RANDOM_BOT_LOGO },
                        caption: textoi
                    }
                );
            }
        } catch (error) {
            logger.log(`(${Config.get("name")}: Erro ao monitorar pasta: ${error})gb(red50, yellow50)`);
        }
    });

    logger.log(`(${Config.get("name")}: Monitoramento de arquivos QR iniciado.)gb(blue50, purple50)`);
    return watcher;
}

function pararMonitoramento() {
    if (watcher) {
        watcher.close();
        watcher = null;
        logger.log(`(${Config.get("name")}: Monitoramento de arquivos QR interrompido.)gb(blue50, purple50)`);
    }
}

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

        const relatorio = gerarRelatorio(contagem);
        return relatorio;
    } catch (error) {
        logger.log(`(${Config.get("name")}: Erro ao limpar arquivos: ${error.message})gb(red50, yellow50)`);
        return `Erro ao limpar arquivos: ${error.message}`;
    }
}

async function listarArquivosJson() {
    try {
        const arquivos = await fs.readdir(DIRECTORY);
        return arquivos.filter(file => file.endsWith('.json'));
    } catch (error) {
        logger.log(`(${Config.get("name")}: Erro ao listar arquivos: ${error})gb(red50, yellow50)`);
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
        logger.log(`(${Config.get("name")}: Erro ao ordenar arquivos: ${error})gb(red50, yellow50)`);
        return arquivos;
    }
}

async function apagarArquivo(nome) {
    try {
        await fs.unlink(path.join(DIRECTORY, nome));
        return true;
    } catch (error) {
        logger.log(`(${Config.get("name")}: Erro ao apagar arquivo ${nome}: ${error})gb(red50, yellow50)`);
        return false;
    }
}

function gerarRelatorio(contagem) {
    const linhas = [];

    const options = {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };

    linhas.push(`• Data: ${new Date().toLocaleString('pt-BR', options)}`);

    for (const [tipo, dados] of Object.entries(contagem)) {
        const { apagados, totais } = dados;
        const restantes = totais - apagados;

        const pctApagado = calcularPorcentagem(apagados, totais);
        const pctRestante = calcularPorcentagem(restantes, totais);

        linhas.push(`\n• ${tipo.toUpperCase()}`);
        linhas.push(`• Apagados: ${apagados} arquivos (${pctApagado}%)`);
        linhas.push(`• Restantes: ${restantes} arquivos (${pctRestante}%)`);
    }

    return linhas.join('\n');
}

function calcularPorcentagem(parte, total) {
    if (total === 0) return '0.0';
    return ((parte / total) * 100).toFixed(1);
}

module.exports = {
    iniciarMonitoramento,
    pararMonitoramento,
    limparArquivos
};