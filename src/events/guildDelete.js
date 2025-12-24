module.exports = {
    name: 'guildDelete',
    async execute(guild, client) {
        console.log(`➖ Sunucudan çıkıldı: ${guild.name} (${guild.id})`);
        
        // Bu sunucudaki tüm odaları temizle
        const rooms = await client.db.getGuildRooms(guild.id);
        
        for (const room of rooms) {
            await client.db.deleteVoiceRoom(room.channelId);
            client.tempVoiceSystem.cleanupTimers(room.channelId);
        }
        
        // Veritabanından sunucu ayarlarını temizle (opsiyonel)
        // await client.db.models.Guild.destroy({ where: { guildId: guild.id } });
        
        console.log(`🧹 ${rooms.length} oda temizlendi`);
        
        // İstatistik güncellemesi (opsiyonel)
        try {
            const statsChannel = client.channels.cache.get('STATS_CHANNEL_ID');
            if (statsChannel) {
                const embed = {
                    color: 0xED4245,
                    title: '📉 Sunucudan Çıkıldı',
                    description: `**${guild.name}** sunucusundan çıkarıldık.`,
                    fields: [
                        { name: 'Sunucu ID', value: guild.id, inline: true },
                        { name: 'Temizlenen Oda', value: rooms.length.toString(), inline: true },
                        { name: 'Kalan Sunucu', value: (client.guilds.cache.size).toString(), inline: true }
                    ],
                    timestamp: new Date()
                };
                
                await statsChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Çıkış istatistiği hatası:', error.message);
        }
    }
};