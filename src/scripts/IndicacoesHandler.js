const fs = require('fs');
const path = require('path');

const INDICACOES_PATH = path.join(__dirname, '../../assets/grupos/indicacoes.json');

class IndicacoesManager {
    constructor() {
        this.indicacoes = this.carregarIndicacoes();
    }

    carregarIndicacoes() {
        try {
            if (!fs.existsSync(INDICACOES_PATH)) {
                return [];
            }

            const data = fs.readFileSync(INDICACOES_PATH, 'utf-8');
            const parsed = JSON.parse(data);
            if (parsed && !Array.isArray(parsed)) {
                const converted = [];
                for (const [usuarioId, grupos] of Object.entries(parsed)) {
                    converted.push({ usuarioId, grupos });
                }
                return converted;
            }

            return parsed || [];
        } catch (error) {
            console.error('Erro ao carregar indicações:', error);
            return [];
        }
    }


    salvarIndicacoes() {
        try {
            const dir = path.dirname(INDICACOES_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(INDICACOES_PATH, JSON.stringify(this.indicacoes, null, 4));
            return true;
        } catch (error) {
            console.error('Erro ao salvar indicações:', error);
            return false;
        }
    }

    normalizarId(id, tipo = 'usuario') {
        if (!id) return '';
        const limpo = id.replace(/\D/g, '');
        return id.includes('@') ? id : tipo === 'grupo' ? `${limpo}@g.us` : `${limpo}@s.whatsapp.net`;
    }

    verificarUsuarioNoGrupo(grupoId, userId) {
        try {
            const grupoIdNormalizado = this.normalizarId(grupoId, 'grupo');
            const userIdNormalizado = this.normalizarId(userId);
            for (const usuario of this.indicacoes) {
                const grupo = usuario.grupos.find(g => g.grupoId === grupoIdNormalizado);
                if (grupo && grupo.indicacoes.some(indicacao => indicacao.numero === userIdNormalizado)) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Erro ao verificar usuário no grupo:', error);
            return false;
        }
    }

    async adicionarIndicacao(sock, sender, grupoId, numeroIndicado) {
        try {
            const senderId = this.normalizarId(sender);
            const grupoIdNormalizado = this.normalizarId(grupoId, 'grupo');
            const indicadoId = this.normalizarId(numeroIndicado);
            try {
                const groupMetadata = await sock.groupMetadata(grupoIdNormalizado);
                if (groupMetadata.participants.some(p => this.normalizarId(p.id) === indicadoId)) {
                    return {
                        success: false,
                        message: 'Número já está no grupo',
                        code: 'ALREADY_IN_GROUP'
                    };
                }
            } catch (error) {
                console.error('Erro ao verificar membros do grupo:', error);
            }

            if (this.verificarUsuarioNoGrupo(grupoIdNormalizado, indicadoId)) {
                return {
                    success: false,
                    message: 'Número já foi indicado neste grupo',
                    code: 'ALREADY_INDICATED'
                };
            }

            let usuarioEntry = this.indicacoes.find(u => u.usuarioId === senderId);
            if (!usuarioEntry) {
                usuarioEntry = { usuarioId: senderId, grupos: [] };
                this.indicacoes.push(usuarioEntry);
            }

            let grupoEntry = usuarioEntry.grupos.find(g => g.grupoId === grupoIdNormalizado);
            if (!grupoEntry) {
                grupoEntry = { grupoId: grupoIdNormalizado, indicacoes: [] };
                usuarioEntry.grupos.push(grupoEntry);
            }


            grupoEntry.indicacoes.push({
                numero: indicadoId,
                entrou: false,
                dataIndicacao: new Date().toISOString()
            });

            return this.salvarIndicacoes()
                ? { success: true, code: 'SUCCESS' }
                : { success: false, message: 'Erro ao salvar indicações', code: 'SAVE_ERROR' };

        } catch (error) {
            console.error('Erro ao adicionar indicação:', error);
            return {
                success: false,
                message: error.message,
                code: 'UNKNOWN_ERROR'
            };
        }
    }


    getIndicacoesData() {
        return this.indicacoes;
    }

    usuarioExiste(userId) {
        try {
            const idNormalizado = this.normalizarId(userId);
            return this.indicacoes.some(usuario => usuario.usuarioId === idNormalizado);
        } catch (error) {
            console.error('Erro ao verificar usuário:', error);
            return false;
        }
    }
}

module.exports = new IndicacoesManager();