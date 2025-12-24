const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');

module.exports = (client) => {
    const app = express();
    
    // Güvenlik middleware'leri
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https://cdn.discordapp.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"]
            }
        },
        crossOriginEmbedderPolicy: false
    }));
    
    app.use(cors());
    app.use(express.static('public'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    
    // EJS ayarları
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    // Session
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7 // 1 hafta
        }
    }));
    
    // Passport
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Passport Discord Strategy
    passport.use(new DiscordStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.REDIRECT_URI,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));
    
    passport.serializeUser((user, done) => {
        done(null, user);
    });
    
    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });
    
    // Ana sayfa
    app.get('/', (req, res) => {
        const stats = {
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            uptime: process.uptime(),
            version: '2.0.0'
        };
        
        res.render('index', {
            user: req.user,
            bot: client,
            stats: stats,
            isAuthenticated: req.isAuthenticated()
        });
    });
    
    // Auth routes
    app.get('/auth/discord', passport.authenticate('discord'));
    
    app.get('/auth/discord/callback',
        passport.authenticate('discord', {
            failureRedirect: '/',
            failureFlash: true
        }),
        (req, res) => {
            res.redirect('/dashboard');
        }
    );
    
    app.get('/logout', (req, res) => {
        req.logout(() => {
            res.redirect('/');
        });
    });
    
    // Dashboard
    app.get('/dashboard', checkAuth, async (req, res) => {
        try {
            const mutualGuilds = req.user.guilds.filter(guild => 
                (guild.permissions & 0x8) === 0x8 && // ADMINISTRATOR yetkisi
                client.guilds.cache.has(guild.id)
            ).map(guild => ({
                ...guild,
                botInGuild: true,
                guildData: client.guilds.cache.get(guild.id),
                botPermissions: client.guilds.cache.get(guild.id)?.members.me.permissions
            }));
            
            res.render('dashboard', {
                user: req.user,
                guilds: mutualGuilds,
                bot: client
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('error', { error: 'Internal Server Error' });
        }
    });
    
    // Sunucu dashboard
    app.get('/dashboard/:guildId', checkAuth, async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).render('error', { error: 'Sunucu bulunamadı' });
            }
            
            // Yetki kontrolü
            const userGuild = req.user.guilds.find(g => g.id === guildId);
            if (!userGuild || (userGuild.permissions & 0x8) !== 0x8) {
                return res.status(403).render('error', { error: 'Bu sunucuyu yönetmek için yetkiniz yok' });
            }
            
            const guildData = await client.db.getGuild(guildId);
            const activeRooms = await client.db.getGuildRooms(guildId);
            
            res.render('guild-dashboard', {
                user: req.user,
                guild,
                guildData,
                activeRooms,
                bot: client
            });
        } catch (error) {
            console.error('Guild dashboard error:', error);
            res.status(500).render('error', { error: 'Internal Server Error' });
        }
    });
    
    // Ayarları güncelle
    app.post('/dashboard/:guildId/settings', checkAuth, async (req, res) => {
        try {
            const guildId = req.params.guildId;
            
            // Yetki kontrolü
            const userGuild = req.user.guilds.find(g => g.id === guildId);
            if (!userGuild || (userGuild.permissions & 0x8) !== 0x8) {
                return res.status(403).json({ success: false, error: 'Yetkiniz yok' });
            }
            
            const {
                defaultBitrate,
                defaultUserLimit,
                maxRooms,
                afkEnabled,
                afkTime,
                afkAction,
                defaultTheme
            } = req.body;
            
            // Validasyon
            const bitrate = Math.min(Math.max(parseInt(defaultBitrate) || 64000, 8000), 384000);
            const userLimit = Math.min(Math.max(parseInt(defaultUserLimit) || 10, 0), 99);
            const maxRoomsCount = Math.min(Math.max(parseInt(maxRooms) || 5, 1), 50);
            const afkTimeValue = Math.min(Math.max(parseInt(afkTime) || 5, 1), 60);
            
            await client.db.updateGuild(guildId, {
                defaultBitrate: bitrate,
                defaultUserLimit: userLimit,
                maxRooms: maxRoomsCount,
                afkEnabled: afkEnabled === 'true',
                afkTime: afkTimeValue,
                afkAction: ['none', 'warn', 'kick'].includes(afkAction) ? afkAction : 'none',
                defaultTheme: ['🔥', '💜', '💙'].includes(defaultTheme) ? defaultTheme : '💙'
            });
            
            res.json({ 
                success: true, 
                message: 'Ayarlar başarıyla güncellendi!'
            });
        } catch (error) {
            console.error('Settings update error:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });
    
    // API Routes
    app.get('/api/stats', async (req, res) => {
        try {
            const stats = await client.db.getStats();
            const botStats = {
                guilds: client.guilds.cache.size,
                users: client.users.cache.size,
                channels: client.channels.cache.size,
                uptime: client.uptime,
                ping: client.ws.ping,
                memory: process.memoryUsage()
            };
            
            res.json({
                success: true,
                database: stats,
                bot: botStats,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('API stats error:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });
    
    // 404 Handler
    app.use((req, res) => {
        res.status(404).render('error', { error: 'Sayfa bulunamadı' });
    });
    
    // Error handler
    app.use((err, req, res, next) => {
        console.error('Server error:', err);
        res.status(500).render('error', { error: 'Internal Server Error' });
    });
    
    // Middleware: Auth kontrolü
    function checkAuth(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.redirect('/auth/discord');
    }
    
    // PORT otomatik bulma fonksiyonu
    async function findAvailablePort(startPort = 3000, maxAttempts = 10) {
        const net = require('net');
        
        function portInUse(port) {
            return new Promise((resolve) => {
                const server = net.createServer();
                
                server.once('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
                
                server.once('listening', () => {
                    server.close();
                    resolve(false);
                });
                
                server.listen(port);
            });
        }
        
        for (let i = 0; i < maxAttempts; i++) {
            const port = startPort + i;
            const inUse = await portInUse(port);
            
            if (!inUse) {
                return port;
            }
            
            console.log(`Port ${port} kullanımda, bir sonrakini deniyorum...`);
        }
        
        throw new Error(`Uygun port bulunamadı (${startPort}-${startPort + maxAttempts - 1})`);
    }
    
    // Server başlatma
    async function startServer() {
        try {
            const PORT = await findAvailablePort(3000, 20);
            const server = http.createServer(app);
            
            server.listen(PORT, () => {
                console.log(`🌐 Dashboard http://localhost:${PORT} adresinde çalışıyor`);
                console.log(`📊 API Endpoint: http://localhost:${PORT}/api/stats`);
            });
            
            // Graceful shutdown
            process.on('SIGTERM', () => {
                console.log('SIGTERM received. Shutting down gracefully...');
                server.close(() => {
                    console.log('HTTP server closed.');
                    process.exit(0);
                });
            });
            
            return server;
        } catch (error) {
            console.error('❌ Server başlatma hatası:', error);
            // Dashboard olmadan devam et
            console.log('⚠️ Dashboard başlatılamadı, sadece Discord bot çalışacak.');
            return null;
        }
    }
    
    // Server'ı başlat
    startServer();
    
    return app;
};