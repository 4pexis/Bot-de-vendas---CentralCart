const { EmbedBuilder } = require('discord.js');

/**
 * apx passou aqui
 * @param {string} description
 * @returns {EmbedBuilder}
 */
const createSuccessEmbed = (description) => {
    return new EmbedBuilder()
        .setColor('#28a745')
        .setDescription(`✅ ${description}`);
};

/**
 * apx passou aqui
 * @param {string} description
 * @returns {EmbedBuilder}
 */
const createErrorEmbed = (description) => {
    return new EmbedBuilder()
        .setColor('#dc3545')
        .setDescription(`❌ ${description}`);
};

module.exports = { createSuccessEmbed, createErrorEmbed };