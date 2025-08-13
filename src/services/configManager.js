const fs = require('node:fs');
const path = require('node:path');

const configPath = path.join(__dirname, '..', 'config.json');

function getConfig() {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Arquivo de configuração não encontrado, usando padrão.');
        return {
            cartCategoryId: null,
            staffRoleId: null,
            customerRoleId: null,
            logChannelId: null
        };
    }
}

function setConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Erro ao salvar a configuração:', error);
    }
}

module.exports = { getConfig, setConfig };