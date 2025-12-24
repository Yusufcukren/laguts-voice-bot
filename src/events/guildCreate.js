module.exports = {
    name: 'guildCreate',
    async execute(guild, client) {
        console.log(`➕ Yeni sunucu: ${guild.name} (${guild.id}) - ${guild.memberCount} üye`);
        
        // Veritabanına ekle
        await client.db.getGuild(guild.id);
        
        // Default kanalı bul
        const defaultChannel = guild.channels.cache.find(
            ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SEND_MESSAGES')
        ) || guild.systemChannel;
        
        if (defaultChannel) {
            const embed = {
                color: 0x5865F2,
                title: '🎉 LaGuts Bot Sunucunuza Katıldı!',
                description: 'Merhaba! Ben gelişmiş özel ses odası botuyum.',
                fields: [
                    {
                        name: '🚀 Hızlı Başlangıç',
                        value: '1. `/setup` komutu ile sistemi kur\n2. Oluşan kanala gidip butona bas\n3. Özel odanı oluştur ve özelleştir!',
                        inline: false
                    },
                    {
                        name: '⚡ Özellikler',
                        value: '• Özel ses odaları\n• Oda kontrol paneli\n• 3 farklı tema\n• AFK sistemi\n• Web dashboard\n• Tamamen ücretsiz',
                        inline: false
                    }
                ],
                footer: {
                    text: `Şu anda ${client.guilds.cache.size} sunucuda aktif!`
                },
                timestamp: new Date()
            };
            
            try {
                await defaultChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Hoş geldin mesajı gönderilemedi:', error.message);
            }
        }
        
        // Bot istatistiklerini güncelle (opsiyonel)
        try {
            const statsChannel = client.channels.cache.get('STATS_CHANNEL_ID'); // İstatistik kanalı ID'si
            if (statsChannel) {
                const embed = {
                    color: 0x57F287,
                    title: '📈 Yeni Sunucu!',
                    description: `**${guild.name}** sunucusuna katıldık!`,
                    fields: [
                        { name: 'Sunucu ID', value: guild.id, inline: true },
                        { name: 'Üye Sayısı', value: guild.memberCount.toString(), inline: true },
                        { name: 'Sunucu Sahibi', value: (await guild.fetchOwner()).user.tag, inline: true },
                        { name: 'Toplam Sunucu', value: client.guilds.cache.size.toString(), inline: true }
                    ],
                    thumbnail: { url: guild.iconURL({ dynamic: true }) || '' },
                    timestamp: new Date()
                };
                
                await statsChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('İstatistik güncelleme hatası:', error.message);
        }
    }
};