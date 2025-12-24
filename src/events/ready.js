const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} başarıyla giriş yaptı!`);
        console.log(`📊 ${client.guilds.cache.size} sunucu, ${client.users.cache.size} kullanıcı`);

        // Bot durumunu ayarla
        const activities = [
            { name: '/setup | Özel Odalar', type: ActivityType.Watching },
            { name: `${client.guilds.cache.size} sunucu`, type: ActivityType.Listening },
            { name: 'v2.0.0 | laguts.com', type: ActivityType.Playing }
        ];

        let activityIndex = 0;
        
        // Her 30 saniyede bir durumu değiştir
        setInterval(() => {
            const activity = activities[activityIndex];
            
            client.user.setPresence({
                activities: [{
                    name: activity.name,
                    type: activity.type
                }],
                status: 'online'
            });

            activityIndex = (activityIndex + 1) % activities.length;
        }, 30000);

        // İlk durumu ayarla
        client.user.setPresence({
            activities: [{
                name: activities[0].name,
                type: activities[0].type
            }],
            status: 'online'
        });

        // Slash komutlarını kaydet
        try {
            const commands = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
            
            // Global komutlar
            await client.application.commands.set(commands);
            console.log(`📝 ${commands.length} slash komutu global olarak kaydedildi!`);
            
            // Her sunucu için komutları sync et (opsiyonel)
            client.guilds.cache.forEach(async guild => {
                try {
                    await guild.commands.set(commands);
                    console.log(`✅ ${guild.name} komutları sync edildi`);
                } catch (error) {
                    console.error(`${guild.name} komut sync hatası:`, error.message);
                }
            });
        } catch (error) {
            console.error('❌ Slash komut kayıt hatası:', error);
        }

        // Boş odaları temizle
        client.guilds.cache.forEach(async (guild) => {
            try {
                const cleaned = await client.tempVoiceSystem.cleanupAllEmptyRooms(guild);
                if (cleaned > 0) {
                    console.log(`🧹 ${guild.name}: ${cleaned} boş oda temizlendi`);
                }
            } catch (error) {
                console.error(`${guild.name} temizleme hatası:`, error.message);
            }
        });

        // Her dakika boş odaları kontrol et
        setInterval(() => {
            client.guilds.cache.forEach(async (guild) => {
                try {
                    await client.tempVoiceSystem.cleanupAllEmptyRooms(guild);
                } catch (error) {
                    console.error(`${guild.name} interval temizleme hatası:`, error.message);
                }
            });
        }, 60000); // 1 dakika

        // Her 5 dakikada bir veritabanı optimizasyonu
        setInterval(async () => {
            try {
                await client.db.cleanupOldData(1); // 1 günden eski verileri temizle
            } catch (error) {
                console.error('Veritabanı temizleme hatası:', error.message);
            }
        }, 300000); // 5 dakika

        // Bot başlangıç zamanını kaydet
        client.startTime = Date.now();
        
        console.log('🎉 Bot tamamen hazır ve çalışıyor!');
        console.log(`🌐 Dashboard: ${process.env.WEBSITE_URL || 'http://localhost:3000'}`);
        console.log('=======================================');
    }
};