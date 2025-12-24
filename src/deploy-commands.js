require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ ${command.data.name} komutu yüklendi`);
    } else {
        console.log(`⚠️ ${filePath} geçersiz komut dosyası`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`📝 ${commands.length} slash komutu deploy ediliyor...`);

        // Global komutları deploy et
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`🎉 ${data.length} slash komutu başarıyla deploy edildi!`);
        
        // Her sunucu için ayrı deploy (opsiyonel)
        /*
        const guilds = ['SUNUCU_ID_1', 'SUNUCU_ID_2']; // Sunucu ID'lerini buraya ekle
        for (const guildId of guilds) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                    { body: commands }
                );
                console.log(`✅ ${guildId} sunucusuna komutlar deploy edildi`);
            } catch (error) {
                console.error(`${guildId} deploy hatası:`, error.message);
            }
        }
        */
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Komut deploy hatası:', error);
        process.exit(1);
    }
})();