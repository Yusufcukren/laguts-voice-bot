const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('istatistik')
        .setDescription('Bot istatistiklerini gösterir')
        .setDMPermission(true),

    async execute(interaction, client) {
        try {
            await interaction.deferReply();

            // Bot istatistikleri
            const uptime = moment.duration(client.uptime).format("d [gün], h [saat], m [dakika], s [saniye]");
            const memoryUsage = process.memoryUsage();
            const usedMemory = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const totalMemory = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            
            // Database istatistikleri
            const stats = await client.db.getStats();
            
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📊 Bot İstatistikleri')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '🤖 Bot Bilgileri',
                        value: `**Ping:** ${client.ws.ping}ms\n**Çalışma Süresi:** ${uptime}\n**Hafıza:** ${usedMemory}MB / ${totalMemory}MB`,
                        inline: true
                    },
                    {
                        name: '🌐 Sunucu İstatistikleri',
                        value: `**Toplam Sunucu:** ${stats.totalGuilds}\n**Aktif Odalar:** ${stats.totalRooms}\n**Discord Sunucuları:** ${client.guilds.cache.size}`,
                        inline: true
                    },
                    {
                        name: '📈 Performans',
                        value: `**Kullanıcılar:** ${client.users.cache.size}\n**Kanallar:** ${client.channels.cache.size}\n**Emojiler:** ${client.emojis.cache.size}`,
                        inline: true
                    },
                    {
                        name: '🎮 Sistem Özellikleri',
                        value: '• Tamamen Ücretsiz\n• Sınırsız Oda Oluşturma\n• 3 Farklı Tema\n• 4 Oda Türü\n• AFK Sistemi\n• Web Kontrol Paneli\n• Gelişmiş Güvenlik',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: `© ${client.user.username} | Tüm hakları saklıdır`, 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setTimestamp();

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