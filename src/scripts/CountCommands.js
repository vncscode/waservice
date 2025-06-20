const fs = require('fs');

function CountCmdsJS(nomePasta) {
    try {

        const arquivos = fs.readdirSync(nomePasta);
    
        const arquivosJS = arquivos.filter(arquivo => 
            arquivo.toLowerCase().endsWith('.js') && 
            fs.statSync(`../${nomePasta}/${arquivo}`).isFile()
        );
        
        return arquivosJS.length;
        
    } catch (error) {
        console.error(`Erro ao contar arquivos: ${error.message}`);
        return 0;
    }
}

module.exports = CountCmdsJS;