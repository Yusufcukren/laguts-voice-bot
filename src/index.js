require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    Partials,
    ActivityType 
} = require('discord.js');
const Database = require('./database/Database');
const fs = require('fs');
const path = require('path');
const http = require('http');

class AdvancedVoiceBot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences
            ],
            partials: [Partials.Channel, Partials.GuildMember],
            presence: {
                status: 'online',
                activities: [{
                    name: '/setup | v2.0',
                    type: ActivityType.Watching
                }]
            },
            // Railway için optimize ayarlar
            restTimeOffset: 0,
            restGlobalRateLimit: 50,
            failIfNotExists: false,
            allowedMentions: {
                parse: ['roles', 'users'],
                repliedUser: true
            }
        });

        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.db = new Database();
        
        // Sistemler
        this.systems = {
            tempVoice: null,
            afk: null,
            security: null
        };

        // Railway metrikleri
        this.startTime = Date.now();
        this.readyAt = null;
        this.stats = {
            guilds: 0,
            users: 0,
            channels: 0,
            voiceRooms: 0
        };

        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Bot başlatılıyor...');
            
            // 1. Veritabanı
            await this.initializeDatabase();
            
            // 2. Sistemleri yükle
            await this.loadSystems();
            
            // 3. Event'ları yükle
            await this.loadEvents();
            
            // 4. Komutları yükle
            await this.loadCommands();
            
            console.log('✅ Tüm sistemler yüklendi!');
            
        } catch (error) {
            console.error('❌ Başlatma hatası:', error);
            this.handleShutdown(1);
        }
    }

    async initializeDatabase() {
        try {
            await this.db.initialize();
            
            // Railway için database path kontrolü
            const dbPath = process.env.DB_PATH || '/tmp/database.sqlite';
            console.log(`🗄️ Database path: ${dbPath}`);
            
            // Test sorgusu
            await this.db.sequelize.authenticate();
            console.log('✅ Veritabanı bağlantısı başarılı!');
            
        } catch (error) {
            console.error('❌ Veritabanı hatası:', error.message);
            
            // Railway'de /tmp kullan
            if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
                console.log('⚠️ /tmp dizininde database oluşturuluyor...');
                process.env.DB_PATH = '/tmp/database.sqlite';
                
                // Yeniden dene
                setTimeout(() => this.initializeDatabase(), 1000);
            } else {
                throw error;
            }
        }
    }

    async loadSystems() {
        try {
            const systemsPath = path.join(__dirname, 'systems');
            
            // TempVoiceSystem
            const TempVoiceSystem = require(path.join(systemsPath, 'TempVoiceSystem'));
            this.systems.tempVoice = new TempVoiceSystem(this);
            console.log('✅ TempVoiceSystem yüklendi');
            
            // AfkSystem
            const AfkSystem = require(path.join(systemsPath, 'AfkSystem'));
            this.systems.afk = new AfkSystem(this);
            console.log('✅ AfkSystem yüklendi');
            
            // SecuritySystem (opsiyonel - hata verirse atla)
            try {
                const SecuritySystem = require(path.join(systemsPath, 'SecuritySystem'));
                this.systems.security = new SecuritySystem(this);
                console.log('✅ SecuritySystem yüklendi');
            } catch (error) {
                console.log('⚠️ SecuritySystem yüklenemedi, devam ediliyor...');
                this.systems.security = {
                    checkRateLimit: () => true,
                    sanitizeInput: (input) => input
                };
            }
            
        } catch (error) {
            console.error('❌ Sistem yükleme hatası:', error);
            // Sistemler olmadan devam et
            this.systems.tempVoice = { cleanupAllEmptyRooms: () => Promise.resolve(0) };
            this.systems.afk = { handleVoiceStateUpdate: () => Promise.resolve() };
            this.systems.security = { checkRateLimit: () => true };
        }
    }

    async loadEvents() {
        try {
            const eventsPath = path.join(__dirname, 'events');
            
            // Temel event'ları manuel yükle (Railway için optimize)
            const events = {
                'ready': require(path.join(eventsPath, 'ready.js')),
                'interactionCreate': require(path.join(eventsPath, 'interactionCreate.js')),
                'voiceStateUpdate': require(path.join(eventsPath, 'voiceStateUpdate.js'))
            };
            
            for (const [eventName, event] of Object.entries(events)) {
                if (event.once) {
                    this.once(eventName, (...args) => event.execute(...args, this));
                } else {
                    this.on(eventName, (...args) => event.execute(...args, this));
                }
                console.log(`✅ Event yüklendi: ${eventName}`);
            }
            
            // Opsiyonel event'lar
            const optionalEvents = ['guildCreate', 'guildDelete'];
            optionalEvents.forEach(eventName => {
                try {
                    const eventPath = path.join(eventsPath, `${eventName}.js`);
                    if (fs.existsSync(eventPath)) {
                        const event = require(eventPath);
                        if (event.once) {
                            this.once(eventName, (...args) => event.execute(...args, this));
                        } else {
                            this.on(eventName, (...args) => event.execute(...args, this));
                        }
                        console.log(`✅ Event yüklendi: ${eventName}`);
                    }
                } catch (error) {
                    // Event yoksa sorun değil
                }
            });
            
        } catch (error) {
            console.error('❌ Event yükleme hatası:', error);
        }
    }

    async loadCommands() {
        try {
            const commandsPath = path.join(__dirname, 'commands');
            
            if (!fs.existsSync(commandsPath)) {
                console.log('⚠️ Commands klasörü yok, oluşturuluyor...');
                fs.mkdirSync(commandsPath, { recursive: true });
                return;
            }
            
            const commandFiles = fs.readdirSync(commandsPath)
                .filter(file => file.endsWith('.js'));
            
            console.log(`📁 ${commandFiles.length} komut dosyası bulundu`);
            
            for (const file of commandFiles) {
                try {
                    const commandPath = path.join(commandsPath, file);
                    const command = require(commandPath);
                    
                    if ('data' in command && 'execute' in command) {
                        this.commands.set(command.data.name, command);
                        console.log(`✅ Komut yüklendi: ${command.data.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Komut yükleme hatası (${file}):`, error.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Komut yükleme hatası:', error);
        }
    }

    async start() {
        try {
            console.log('🔑 Discord token kontrol ediliyor...');
            
            if (!process.env.DISCORD_TOKEN) {
                throw new Error('DISCORD_TOKEN environment variable bulunamadı!');
            }
            
            // Discord'a bağlan
            console.log('🤖 Discord\'a bağlanılıyor...');
            await this.login(process.env.DISCORD_TOKEN);
            
            this.readyAt = Date.now();
            const uptime = Math.floor((this.readyAt - this.startTime) / 1000);
            
            console.log(`🎉 ${this.user.tag} başarıyla giriş yaptı! (${uptime}s)`);
            console.log(`📊 ${this.guilds.cache.size} sunucu, ${this.users.cache.size} kullanıcı`);
            
            // Slash komutlarını kaydet
            await this.registerCommands();
            
            // Dashboard'u başlat (Railway PORT değişkenini kullan)
            await this.startDashboard();
            
            // Healthcheck endpoint
            await this.startHealthcheck();
            
            // Temizleme interval'ları
            this.setupIntervals();
            
            console.log('=======================================');
            console.log('🚀 BOT TAMAMEN HAZIR VE ÇALIŞIYOR!');
            console.log(`🌐 Railway URL: ${process.env.WEBSITE_URL || 'PORT: ' + (process.env.PORT || 3000)}`);
            console.log('=======================================');
            
            // Railway metriklerini güncelle
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Başlatma hatası:', error);
            
            // Discord API hatası
            if (error.code === 'TOKEN_INVALID') {
                console.error('❌ GEÇERSİZ DISCORD TOKEN!');
                console.error('Lütfen Railway Variables\'a doğru token\'ı ekleyin.');
            }
            
            // Rate limit hatası
            if (error.code === 429) {
                console.error('⚠️ Rate limit, 5 saniye bekleniyor...');
                setTimeout(() => this.start(), 5000);
                return;
            }
            
            this.handleShutdown(1);
        }
    }

    async registerCommands() {
        try {
            const commands = Array.from(this.commands.values())
                .map(cmd => cmd.data.toJSON());
            
            // Global komutlar
            await this.application.commands.set(commands);
            console.log(`📝 ${commands.length} slash komutu kaydedildi!`);
            
        } catch (error) {
            console.error('❌ Komut kayıt hatası:', error.message);
        }
    }

    async startDashboard() {
        try {
            // Railway PORT değişkenini kullan
            const PORT = process.env.PORT || 3000;
            
            // Basit healthcheck server (Railway için)
            const server = http.createServer((req, res) => {
                if (req.url === '/health' || req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'ok',
                        bot: this.user?.tag || 'starting',
                        uptime: this.readyAt ? Date.now() - this.readyAt : 0,
                        guilds: this.guilds.cache.size,
                        timestamp: new Date().toISOString()
                    }));
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            });
            
            server.listen(PORT, '0.0.0.0', () => {
                console.log(`🌐 Healthcheck server port ${PORT}'de çalışıyor`);
                console.log(`🔗 Endpoint: http://0.0.0.0:${PORT}/health`);
            });
            
            // Railway shutdown handling
            server.on('error', (error) => {
                console.error('❌ Server hatası:', error.message);
            });
            
            this.server = server;
            
        } catch (error) {
            console.error('❌ Dashboard başlatma hatası:', error.message);
            // Dashboard olmadan devam et
        }
    }

    async startHealthcheck() {
        // Railway healthcheck için özel endpoint
        console.log('🏥 Railway healthcheck aktif');
        
        // Bot durumunu periyodik kontrol et
        setInterval(() => {
            if (!this.isReady()) {
                console.warn('⚠️ Bot ready durumunda değil!');
            }
        }, 30000);
    }

    setupIntervals() {
        // Her dakika boş odaları temizle
        setInterval(async () => {
            try {
                for (const [guildId, guild] of this.guilds.cache) {
                    await this.systems.tempVoice.cleanupAllEmptyRooms(guild);
                }
            } catch (error) {
                console.error('Temizleme hatası:', error.message);
            }
        }, 60000);
        
        // Her 5 dakikada istatistik güncelle
        setInterval(() => this.updateStats(), 300000);
        
        // Memory usage log
        setInterval(() => {
            const memory = process.memoryUsage();
            const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
            console.log(`🧠 Memory: ${usedMB}MB`);
        }, 60000);
    }

    updateStats() {
        this.stats = {
            guilds: this.guilds.cache.size,
            users: this.users.cache.size,
            channels: this.channels.cache.size,
            voiceRooms: this.systems.tempVoice?.roomCount || 0,
            uptime: this.readyAt ? Date.now() - this.readyAt : 0
        };
    }

    handleShutdown(exitCode = 0) {
        console.log('\n🔴 Bot kapatılıyor...');
        
        // Temiz kapatma
        try {
            if (this.server) {
                this.server.close();
            }
            
            if (this.db) {
                this.db.sequelize.close();
            }
            
            this.destroy();
            
        } catch (error) {
            console.error('Kapatma hatası:', error);
        }
        
        setTimeout(() => {
            process.exit(exitCode);
        }, 5000);
    }
}

// Botu başlat
const client = new AdvancedVoiceBot();

// Hata yakalama
process.on('unhandledRejection', (error) => {
    console.error('❌ İşlenmemiş Promise hatası:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ İşlenmemiş Exception:', error);
    client.handleShutdown(1);
});

// Railway sinyalleri
process.on('SIGTERM', () => {
    console.log('📡 SIGTERM alındı, kapatılıyor...');
    client.handleShutdown(0);
});

process.on('SIGINT', () => {
    console.log('📡 SIGINT alındı, kapatılıyor...');
    client.handleShutdown(0);
});

// Botu başlat
client.start();

module.exports = client;