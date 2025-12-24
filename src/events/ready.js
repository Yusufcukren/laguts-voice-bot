module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} çevrimiçi!`);
        
        // Railway log
        console.log('🚀 Railway üzerinde çalışıyor');
        console.log(`🌐 PORT: ${process.env.PORT || 3000}`);
        console.log(`🔗 URL: ${process.env.WEBSITE_URL || 'Belirtilmemiş'}`);
        
        // Bot durumu
        client.user.setPresence({
            activities: [{
                name: `v2.0 | ${client.guilds.cache.size} sunucu`,
                type: 3 // WATCHING
            }],
            status: 'online'
        });
    }
};