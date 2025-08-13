const { Events, REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            const commands = [];
            const foldersPath = path.join(__dirname, '..', 'commands');
            const commandFolders = fs.readdirSync(foldersPath);

            for (const folder of commandFolders) {
                const commandsPath = path.join(foldersPath, folder);
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        commands.push(command.data.toJSON());
                    }
                }
            }

            const rest = new REST().setToken(process.env.DISCORD_TOKEN);
            
            console.log(`[DEPLOY] Iniciando registro de ${commands.length} comandos (/).`);
            
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            
            console.log(`[DEPLOY] ${commands.length} comandos foram registrados com sucesso.`);

            
        } catch (error) {
            console.error('[DEPLOY] Erro ao registrar comandos:', error);
        }

        setTimeout(() => {
            console.clear();

            const asciiArt = `
                                                                                                                                            
              ##########                                                                              ##                                    
          ######    ####                                                                              ##                                    
      ########                                ##          ##          ##    ####            ##        ##      ##        ##          ##  ##  
    ######                      ##          ########  ####  ##    ##  ####  ####    ####  ##########  ##  ########    ##  ####  ######  ##  
######          ######          ####      ##          ##      ##  ##    ##  ####    ##    ##    ####  ##  ##        ##      ##  ##      ##  
######        ########          ####      ##          ##          ##    ##  ####    ##    ##    ####  ##  ##        ##      ##  ##      ##  
  ########                  ######          ########  ########    ##    ##    ####  ##    ##########  ##  ########    ########  ##      ####
      ######            ########                                                                                                            
          ######      ######                                                                                                                
              ##########                                                                                                                         
                                

                                - desenvolvido com amor por apx dev ❤
`;
            console.log(asciiArt);

        }, 2000);

        client.user.setActivity('Gerenciando Vendas | CentralCart', { type: 'PLAYING' });
    },
};