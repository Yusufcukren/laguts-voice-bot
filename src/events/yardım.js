const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedManager = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardım')
        .setDescription('Bot hakkında yardım menüsünü gösterir')
        .setDMPermission(true),

    async execute(interaction, client) {
        const embed = embedManager.createHelpEmbed(interaction.guild || { client });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🌐 Web Sitesi')
                    .setStyle(ButtonStyle.Link)
                    .setURL(process.env.WEBSITE_URL || 'http://localhost:3000'),
                new ButtonBuilder()
                    .setLabel('📚 Komut Listesi')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('help_commands'),
                new ButtonBuilder()
                    .setLabel('❓ Destek Sunucusu')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/WUsFcuMNNA') // Discord sunucu linki
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: false
        });
    }
};