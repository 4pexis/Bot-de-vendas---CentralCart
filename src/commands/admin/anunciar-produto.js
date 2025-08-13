const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const centralCart = require('../../services/centralCartService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anunciar-produto')
        .setDescription('Envia uma mensagem de venda de um produto para um canal específico.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('produto')
                .setDescription('Comece a digitar o nome do produto para ver as opções.')
                .setRequired(true)
                .setAutocomplete(true))
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('O canal onde a mensagem de venda será enviada.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        try {
            const response = await centralCart.getPackages();
            const products = response.data.data;
            
            const filtered = products.filter(product => 
                product.name.toLowerCase().includes(focusedValue.toLowerCase())
            );

            await interaction.respond(
                filtered.slice(0, 25).map(choice => ({
                    name: `${choice.name} (ID: ${choice.id})`,
                    value: choice.id,
                })),
            );
        } catch (error) {
            console.error('Erro no autocomplete de produtos:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const productId = interaction.options.getInteger('produto');
        const targetChannel = interaction.options.getChannel('canal');

        await interaction.deferReply({ ephemeral: true });

        try {
            const product = await centralCart.getPackageById(productId);

            if (!product) {
                return await interaction.editReply({ content: `❌ Erro: Produto com ID \`${productId}\` não foi encontrado.` });
            }

            const cleanDescription = product.description ? product.description.replace(/<[^>]*>/g, '') : 'Confira os detalhes deste incrível produto!';

            const productEmbed = new EmbedBuilder()
                .setColor('#0D9373')
                .setTitle(`🛒 ${product.name}`)
                .setDescription(cleanDescription)
                .setImage(product.image)
                .addFields(
                    { name: '💰 Preço', value: product.price_display, inline: true },
                    { name: '📦 ID do Produto', value: `\`${product.id}\``, inline: true }
                )
                .setFooter({ text: 'Clique no botão abaixo para comprar de forma segura e automatizada!' });

            const buyButton = new ButtonBuilder()
                .setCustomId(`buy-product_${product.id}`)
                .setLabel('Comprar Agora')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💳');

            const row = new ActionRowBuilder().addComponents(buyButton);

            await targetChannel.send({ embeds: [productEmbed], components: [row] });

            await interaction.editReply({ content: `✅ Mensagem de venda do produto **${product.name}** enviada com sucesso no canal ${targetChannel}!` });

        } catch (error) {
            console.error('Erro ao anunciar produto:', error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao executar este comando.' });
        }
    },
};