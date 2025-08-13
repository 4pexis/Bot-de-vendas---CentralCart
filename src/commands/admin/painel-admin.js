// src/commands/admin/painel-admin.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getConfig } = require('../../services/configManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel-admin')
        .setDescription('Exibe o painel de configuração do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const config = getConfig();

        const panelEmbed = new EmbedBuilder()
            .setColor('#2C2F33')
            .setTitle('⚙️ Painel de Configuração do Bot')
            .setDescription('Use os botões abaixo para configurar os IDs essenciais para o funcionamento do bot.')
            .addFields(
                { 
                    name: '🛒 Categoria dos Carrinhos', 
                    value: config.cartCategoryId ? `<#${config.cartCategoryId}> (ID: \`${config.cartCategoryId}\`)` : 'Não configurado',
                    inline: false 
                },
                { 
                    name: '🛡️ Cargo de Staff/Admin', 
                    value: config.staffRoleId ? `<@&${config.staffRoleId}> (ID: \`${config.staffRoleId}\`)` : 'Não configurado',
                    inline: false 
                },
                { 
                    name: '⭐ Cargo de Cliente', 
                    value: config.customerRoleId ? `<@&${config.customerRoleId}> (ID: \`${config.customerRoleId}\`)` : 'Não configurado',
                    inline: false 
                },
                { 
                    name: '📜 Canal de Logs de Vendas', 
                    value: config.logChannelId ? `<#${config.logChannelId}> (ID: \`${config.logChannelId}\`)` : 'Não configurado',
                    inline: false 
                }
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('config-set-cat').setLabel('Alterar Categoria').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('config-set-staff').setLabel('Alterar Cargo Staff').setStyle(ButtonStyle.Secondary),
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('config-set-customer').setLabel('Alterar Cargo Cliente').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('config-set-log').setLabel('Alterar Canal de Logs').setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({
            embeds: [panelEmbed],
            components: [row1, row2],
            ephemeral: true
        });
    },
};