const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    AttachmentBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

const centralCart = require('../services/centralCartService');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedBuilder');
const { startMonitoring } = require('../services/paymentMonitor');
const { getConfig, setConfig } = require('../services/configManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
                return;
            }

            try {
                if (interaction.isAutocomplete()) {
                    await command.autocomplete(interaction);
                } else {
                    await command.execute(interaction);
                }
            } catch (error) {
                console.error(`Erro no comando ${interaction.commandName}:`, error);
                const errorEmbed = createErrorEmbed('Ocorreu um erro ao processar sua solicitação!');
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
            return;
        }
        
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('config-set-')) {
                const configType = interaction.customId.split('-')[2];
                
                const modal = new ModalBuilder()
                    .setCustomId(`config-update_${configType}`)
                    .setTitle(`Configurar ID - ${configType.charAt(0).toUpperCase() + configType.slice(1)}`);

                const idInput = new TextInputBuilder()
                    .setCustomId('newIdInput')
                    .setLabel(`Cole o novo ID aqui`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                return await interaction.showModal(modal);
            }

            const [action, id] = interaction.customId.split('_');

            if (action === 'buy-product') {
                const config = getConfig();
                if (!config.cartCategoryId || !config.staffRoleId) {
                    return interaction.reply({ embeds: [createErrorEmbed('O bot não foi configurado. Um administrador precisa usar o comando `/painel-admin` primeiro.')], ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });
                const productId = id;
                const guild = interaction.guild;
                const user = interaction.user;
                const channelName = `🛒-carrinho-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 100);

                let cartChannel = guild.channels.cache.find(c => c.name === channelName && c.topic === user.id);

                if (!cartChannel) {
                    try {
                        cartChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildText,
                            topic: user.id,
                            parent: config.cartCategoryId,
                            permissionOverwrites: [
                                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                                { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                            ],
                        });
                        await interaction.editReply(`✅ Seu carrinho foi criado! Acesse o canal ${cartChannel} para continuar.`);
                    } catch (e) {
                        console.error("Erro ao criar canal:", e);
                        return interaction.editReply({ embeds: [createErrorEmbed('Não consegui criar seu canal de carrinho. Verifique minhas permissões e os IDs no painel admin!')] });
                    }
                } else {
                    await interaction.editReply(`Você já tem um carrinho aberto. Acesse o canal ${cartChannel} para continuar.`);
                }
                
                const paymentEmbed = new EmbedBuilder().setTitle('Selecione a Forma de Pagamento').setDescription('Escolha como você gostaria de pagar.').setColor('#0D9373');
                const paymentButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`pay-pix_${productId}`).setLabel('Pagar com PIX').setStyle(ButtonStyle.Primary).setEmoji('💠'),
                );

                await cartChannel.send({ content: `Olá ${user}, bem-vindo ao seu carrinho!`, embeds: [paymentEmbed], components: [paymentButtons] });
                return;
            }

            if (action === 'pay-pix') {
                const productId = id;
                const modal = new ModalBuilder().setCustomId(`checkout-modal_pix_${productId}`).setTitle('Dados para Pagamento PIX');
                const nameInput = new TextInputBuilder().setCustomId('clientName').setLabel("Seu Nome").setStyle(TextInputStyle.Short).setRequired(true);
                const lastNameInput = new TextInputBuilder().setCustomId('clientLastName').setLabel("Seu Sobrenome").setStyle(TextInputStyle.Short).setRequired(true);
                const emailInput = new TextInputBuilder().setCustomId('clientEmail').setLabel("Seu E-mail para Recibo").setStyle(TextInputStyle.Short).setRequired(true);
                const gameIdInput = new TextInputBuilder().setCustomId('gameIdInput').setLabel("Seu ID (Discord ou Jogo)").setValue(interaction.user.id).setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(lastNameInput), new ActionRowBuilder().addComponents(emailInput), new ActionRowBuilder().addComponents(gameIdInput));
                return await interaction.showModal(modal);
            }

            if (action === 'delete-cancel') {
                return await interaction.update({ content: 'Operação cancelada.', components: [] });
            }
        }

        else if (interaction.isModalSubmit()) {
            const [action, type, id] = interaction.customId.split('_');
            
            if (action === 'config-update') {
                const newId = interaction.fields.getTextInputValue('newIdInput');
                if (!/^\d+$/.test(newId)) {
                    return await interaction.reply({ embeds: [createErrorEmbed('O ID informado é inválido. Por favor, insira apenas números.')], ephemeral: true });
                }

                const configType = type;
                let configKey;
                if (configType === 'cat') configKey = 'cartCategoryId';
                else if (configType === 'staff') configKey = 'staffRoleId';
                else if (configType === 'customer') configKey = 'customerRoleId';
                else if (configType === 'log') configKey = 'logChannelId';
                else return;

                setConfig(configKey, newId);
                const newConfig = getConfig();
                
                const updatedEmbed = new EmbedBuilder()
                    .setColor('#28a745')
                    .setTitle('✅ Configuração Atualizada!')
                    .setDescription('O painel foi atualizado com o novo valor.')
                    .addFields(
                        { name: '🛒 Categoria dos Carrinhos', value: newConfig.cartCategoryId ? `<#${newConfig.cartCategoryId}>` : 'Não configurado' },
                        { name: '🛡️ Cargo de Staff/Admin', value: newConfig.staffRoleId ? `<@&${newConfig.staffRoleId}>` : 'Não configurado' },
                        { name: '⭐ Cargo de Cliente', value: newConfig.customerRoleId ? `<@&${newConfig.customerRoleId}>` : 'Não configurado' },
                        { name: '📜 Canal de Logs de Vendas', value: newConfig.logChannelId ? `<#${newConfig.logChannelId}>` : 'Não configurado' }
                    );
                
                return await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
            }

            if (action === 'checkout-modal' && type === 'pix') {
                const productId = id;
                await interaction.deferReply({ ephemeral: true });
                
                const firstName = interaction.fields.getTextInputValue('clientName');
                const lastName = interaction.fields.getTextInputValue('clientLastName');
                const email = interaction.fields.getTextInputValue('clientEmail');
                const identifier = interaction.fields.getTextInputValue('gameIdInput');
                
                try {
                    const checkoutData = { gateway: 'PIX', client_email: email, client_name: `${firstName} ${lastName}`, terms: true, variables: { client_identifier: identifier }, cart: [{ package_id: parseInt(productId), quantity: 1 }] };
                    const response = await centralCart.createCheckout(checkoutData);
                    const paymentData = response.data;
                    
                    if (!paymentData.pix_code || !paymentData.qr_code) { throw new Error("A API não retornou os dados do PIX."); }

                    await interaction.editReply({ content: 'Seus dados foram recebidos! O PIX foi gerado no seu canal de carrinho.', ephemeral: true });
                    
                    const qrCodeBuffer = Buffer.from(paymentData.qr_code.replace('data:image/png;base64,', ''), 'base64');
                    const attachment = new AttachmentBuilder(qrCodeBuffer, { name: 'qrcode.png' });
                    const paymentEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('✨ Pagamento PIX Gerado!')
                        .setDescription('Escaneie o QR Code abaixo ou use o código "Copia e Cola".')
                        .setImage('attachment://qrcode.png')
                        .setFooter({ text: `Pedido: ${paymentData.order_id} | Este PIX expira em breve.` });
                    
                    await interaction.channel.send({ embeds: [paymentEmbed], files: [attachment] });
                    await interaction.channel.send({ content: "```" + paymentData.pix_code + "```" });

                    startMonitoring(interaction, paymentData.order_id);

                } catch (error) {
                    console.error('Erro ao criar checkout PIX:', error.response?.data || error.message);
                    return await interaction.editReply({ embeds: [createErrorEmbed('Não foi possível gerar seu pagamento.')] });
                }
            }
        }
    },
};