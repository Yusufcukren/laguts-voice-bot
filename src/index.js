async loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    
    // Klasör var mı kontrol et
    if (!fs.existsSync(commandsPath)) {
        console.log('⚠️ Commands klasörü bulunamadı, oluşturuluyor...');
        fs.mkdirSync(commandsPath, { recursive: true });
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    console.log(`📁 ${commandFiles.length} komut dosyası bulundu`);
    
    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                this.commands.set(command.data.name, command);
                console.log(`✅ Komut yüklendi: ${command.data.name}`);
            } else {
                console.log(`⚠️ Geçersiz komut dosyası: ${file}`);
            }
        } catch (error) {
            console.error(`❌ Komut yükleme hatası (${file}):`, error.message);
        }
    }
}