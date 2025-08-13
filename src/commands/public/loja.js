// src/commands/public/loja.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const centralCart = require('../../services/centralCartService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loja')
        .setDescription('Mostra todos os produtos disponíveis para compra.'),
        
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Responde de forma privada para o usuário

        try {
            const response = await centralCart.getPackages();
            const products = response.data.data;

            if (!products || products.length === 0) {
                return await interaction.editReply('🤔 Nenhum produto encontrado na loja no momento.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🛍️ Produtos Disponíveis na Loja')
                .setDescription('Abaixo estão os itens que você pode adquirir.\nUse o comando `/anunciar-produto` em um canal para criar um botão de compra!')
                .setColor('#0D9373')
                .setFooter({ text: 'Para comprar, clique nos botões de compra postados nos canais.' });

            // Adiciona cada produto como um campo no embed
            products.slice(0, 25).forEach(product => { // Limita a 25 para não exceder o limite do Discord
                embed.addFields({
                    name: `${product.name} (ID: ${product.id})`,
                    value: `> **Preço:** ${product.price_display}`,
                    inline: false
                });
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao buscar produtos da loja:', error);
            await interaction.editReply('❌ Ocorreu um erro ao tentar buscar os produtos da loja. Tente novamente mais tarde.');
        }
    },
};