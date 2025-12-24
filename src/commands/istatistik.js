const { SlashCommandBuilder } = require('discord.js');
const embedManager = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('istatistik')
        .setDescription('Bot istatistiklerini gösterir')
        .setDMPermission(true),

    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            
            const stats = await client.db.getStats();
            const embed = embedManager.createStatsEmbed(client, stats);
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('İstatistik komutu hatası:', error);
            await interaction.editReply({
                content: '❌ İstatistikler alınırken bir hata oluştu!',
                ephemeral: true
            });
        }
    }
};