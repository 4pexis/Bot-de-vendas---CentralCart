const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Carrega dinamicamente todos os arquivos de comando
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[AVISO] O comando em ${filePath} não possui a propriedade "data" ou "execute".`);
        }
    }
}

// Inicializa o módulo REST para se comunicar com a API do Discord
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Função auto-executável para registrar os comandos
(async () => {
    try {
        console.log(`Iniciando registro de ${commands.length} comandos de aplicação (/).`);

        // O método put atualiza todos os comandos no servidor com o conjunto atual
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`Sucesso! ${data.length} comandos foram (re)carregados.`);
    } catch (error) {
        console.error(error);
    }
})();