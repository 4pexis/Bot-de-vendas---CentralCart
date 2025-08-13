const { EmbedBuilder } = require('discord.js');
const centralCart = require('./centralCartService');
const { createSuccessEmbed } = require('../utils/embedBuilder');
const { getConfig } = require('./configManager');

const activeMonitors = new Set();

/**
 * apx passou aqui
 * @param {import('discord.js').Interaction} interaction
 * @param {object} order
 */
async function logPurchase(interaction, order) {
    const config = getConfig();
    const logChannelId = config.logChannelId;
    if (!logChannelId) return;

    try {
        const logChannel = await interaction.guild.channels.fetch(logChannelId);
        if (!logChannel) {
            console.error(`[Log] Canal de logs com ID ${logChannelId} não foi encontrado.`);
            return;
        }

        const logEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('✅ Nova Venda Realizada!')
            .addFields(
                { name: 'Cliente', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                { name: 'Produto', value: order.packages[0].name, inline: false },
                { name: 'ID do Pedido', value: `\`${order.internal_id}\``, inline: true },
                { name: 'Valor Pago', value: `**${order.price_display}**`, inline: true },
                { name: 'ID de Entrega', value: `\`${order.variables.find(v => v.name === 'client_identifier')?.value || 'N/A'}\``, inline: true }
            )
            .setTimestamp(new Date(order.paid_at));

        await logChannel.send({ embeds: [logEmbed] });

    } catch (error) {
        console.error("Falha ao enviar a mensagem de log:", error);
    }
}

/**
 * apx passou aqui
 * @param {import('discord.js').Interaction} interaction
 * @param {string} orderId
 */
async function startMonitoring(interaction, orderId) {
    if (activeMonitors.has(orderId)) {
        console.log(`[Monitor] O pedido ${orderId} já está sendo monitorado.`);
        return;
    }

    console.log(`[Monitor] Iniciando monitoramento para o pedido ${orderId}.`);
    activeMonitors.add(orderId);

    let attempts = 0;
    const maxAttempts = 45;

    const interval = setInterval(async () => {
        if (attempts++ >= maxAttempts) {
            clearInterval(interval);
            activeMonitors.delete(orderId);
            console.log(`[Monitor] Tempo esgotado para o pedido ${orderId}.`);
            return;
        }
        
        try {
            const response = await centralCart.getOrder(orderId);
            const order = response.data;

            if (order.status === 'APPROVED') {
                clearInterval(interval);
                activeMonitors.delete(orderId);
                console.log(`[Monitor] Pagamento APROVADO para o pedido ${orderId}!`);

                await logPurchase(interaction, order);

                await interaction.channel.send({ embeds: [createSuccessEmbed(`Pagamento do pedido \`#${orderId}\` confirmado com sucesso!`)] });
                
                const config = getConfig();
                const customerRole = config.customerRoleId ? await interaction.guild.roles.fetch(config.customerRoleId).catch(() => null) : null;

                try {
                    const delivery = order.deliveries.find(d => d.type === 'LICENSE_KEY');
                    const productKey = delivery ? delivery.value : 'Produto digital sem chave específica.';

                    const dmEmbed = new EmbedBuilder()
                        .setTitle('✅ Compra Aprovada!')
                        .setColor('#28a745')
                        .setDescription(`Obrigado pela sua compra! Seu produto foi entregue abaixo.\n*Você também recebeu uma confirmação no seu e-mail.*`)
                        .addFields(
                            { name: 'Produto', value: order.packages[0].name },
                            { name: 'Sua Chave', value: `\`\`\`${productKey}\`\`\`` }
                        )
                        .setTimestamp();
                    
                    await interaction.user.send({ embeds: [dmEmbed] });

                    if (customerRole) {
                        await interaction.member.roles.add(customerRole);
                    }

                } catch (dmError) {
                    console.error("Falha ao enviar DM ou adicionar cargo:", dmError);
                    await interaction.channel.send(`${interaction.user}, não consegui te enviar uma DM! Por favor, verifique suas configurações de privacidade para receber seu produto.`);
                }
                
                setTimeout(() => {
                    interaction.channel.delete('Compra finalizada.').catch(e => console.error("Não foi possível deletar o canal do carrinho:", e));
                }, 60000);
            }
        } catch (error) {
            console.error(`[Monitor] Erro ao verificar status do pedido ${orderId}:`, error.message);
        }
    }, 20000);
}

module.exports = { startMonitoring };