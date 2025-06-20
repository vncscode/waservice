const fs = require("fs").promises
const path = require("path")
const NodeCache = require("node-cache")

/**
 * Gerenciador de cache dinâmico para polls
 */
class CacheManager {
  constructor(options = {}) {
    // Cache em memória com TTL padrão de 30 minutos e verificação a cada 60 segundos
    this.memoryCache = new NodeCache({
      stdTTL: options.stdTTL || 1800,
      checkperiod: options.checkperiod || 60,
      useClones: false,
    })

    // Diretório para armazenamento persistente
    this.cacheDir = options.cacheDir || path.join(process.cwd(), "cache")
    this.pollsFile = path.join(this.cacheDir, "polls.json")

    // Inicializa o diretório de cache se não existir
    this._initCacheDir()
  }

  /**
   * Inicializa o diretório de cache
   * @private
   */
  async _initCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      console.error("Erro ao criar diretório de cache:", error)
    }
  }

  /**
   * Salva uma poll no cache
   * @param {string} id - ID único da poll
   * @param {Object} pollData - Dados da poll
   * @param {number} ttl - Tempo de vida em segundos (opcional)
   */
  async setPoll(id, pollData, ttl) {
    // Prepara os dados para armazenamento
    const storableData = this._prepareForStorage(pollData)

    // Salva no cache em memória
    this.memoryCache.set(id, storableData, ttl)

    // Salva no armazenamento persistente
    await this._saveToDisk()

    return true
  }

  /**
   * Recupera uma poll do cache
   * @param {string} id - ID da poll
   * @returns {Object|null} Dados da poll ou null se não encontrada
   */
  async getPoll(id) {
    // Tenta obter do cache em memória primeiro
    let pollData = this.memoryCache.get(id)

    // Se não encontrou e temos armazenamento persistente, tenta carregar de lá
    if (!pollData) {
      await this._loadFromDisk()
      pollData = this.memoryCache.get(id)
    }

    if (pollData) {
      return this._restoreFromStorage(pollData)
    }

    return null
  }

  /**
   * Recupera todas as polls do cache
   * @returns {Object[]} Array com todas as polls
   */
  async getAllPolls() {
    // Garante que carregamos os dados mais recentes do disco
    await this._loadFromDisk()

    const polls = {}
    const keys = this.memoryCache.keys()

    for (const key of keys) {
      const pollData = this.memoryCache.get(key)
      if (pollData) {
        polls[key] = this._restoreFromStorage(pollData)
      }
    }

    return polls
  }

  /**
   * Remove uma poll do cache
   * @param {string} id - ID da poll
   * @returns {boolean} true se removido com sucesso
   */
  async deletePoll(id) {
    const success = this.memoryCache.del(id)
    if (success) {
      await this._saveToDisk()
    }
    return success
  }

  /**
   * Prepara os dados da poll para armazenamento
   * Converte funções e objetos complexos para formato serializável
   * @private
   * @param {Object} pollData - Dados originais da poll
   * @returns {Object} Dados preparados para armazenamento
   */
  _prepareForStorage(pollData) {
    const clone = JSON.parse(
      JSON.stringify({
        ...pollData,
        // Removemos propriedades que não podem ser serializadas
        interaction: undefined,
        message: pollData.message
          ? {
              key: pollData.message.key,
            }
          : undefined,
        options: pollData.options
          ? pollData.options.map((opt) => ({
              name: opt.name,
              // Removemos a função run que não pode ser serializada
            }))
          : [],
        timeout: pollData.timeout ? pollData.timeout.getTime() : null,
        // Armazenamos apenas os nomes dos métodos para referência
        onTimeout: pollData.onTimeout ? true : false,
      }),
    )

    return clone
  }

  /**
   * Restaura os dados da poll do formato de armazenamento
   * @private
   * @param {Object} storedData - Dados armazenados
   * @returns {Object} Dados restaurados
   */
  _restoreFromStorage(storedData) {
    // Restaura a data de timeout
    if (storedData.timeout) {
      storedData.timeout = new Date(storedData.timeout)
    }

    return storedData
  }

  /**
   * Salva o cache atual em disco
   * @private
   */
  async _saveToDisk() {
    try {
      const data = {}
      const keys = this.memoryCache.keys()

      for (const key of keys) {
        data[key] = this.memoryCache.get(key)
      }

      await fs.writeFile(this.pollsFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error("Erro ao salvar cache em disco:", error)
    }
  }

  /**
   * Carrega o cache do disco para a memória
   * @private
   */
  async _loadFromDisk() {
    try {
      const exists = await fs
        .access(this.pollsFile)
        .then(() => true)
        .catch(() => false)

      if (!exists) return

      const data = JSON.parse(await fs.readFile(this.pollsFile, "utf8"))

      for (const [key, value] of Object.entries(data)) {
        // Calcula o TTL restante baseado no timeout
        let ttl = undefined
        if (value.timeout) {
          const timeoutDate = new Date(value.timeout)
          const now = new Date()
          ttl = Math.max(0, Math.floor((timeoutDate - now) / 1000))

          // Se já expirou, não carrega
          if (ttl <= 0) continue
        }

        this.memoryCache.set(key, value, ttl)
      }
    } catch (error) {
      console.error("Erro ao carregar cache do disco:", error)
    }
  }

  /**
   * Limpa polls expiradas do armazenamento persistente
   */
  async cleanup() {
    try {
      await this._loadFromDisk()
      await this._saveToDisk()
    } catch (error) {
      console.error("Erro ao limpar cache:", error)
    }
  }
}

module.exports = CacheManager
