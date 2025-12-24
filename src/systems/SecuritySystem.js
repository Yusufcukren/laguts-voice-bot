const { PermissionsBitField } = require('discord.js');

class SecuritySystem {
    constructor(client) {
        this.client = client;
        this.rateLimits = new Map();
        this.suspiciousActivities = new Map();
        this.voiceFloodCache = new Map();
        
        // Her saat başı cache temizleme
        setInterval(() => this.cleanupOldCache(), 3600000);
    }

    // Rate limit kontrolü
    checkRateLimit(userId, action, limit = 5, window = 60000) {
        const key = `${userId}:${action}`;
        const now = Date.now();
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }
        
        const timestamps = this.rateLimits.get(key);
        const validTimestamps = timestamps.filter(time => now - time < window);
        
        if (validTimestamps.length >= limit) {
            this.logSuspiciousActivity(userId, `Rate limit exceeded: ${action}`);
            return false;
        }
        
        validTimestamps.push(now);
        this.rateLimits.set(key, validTimestamps);
        return true;
    }

    // Şüpheli aktivite loglama
    logSuspiciousActivity(userId, reason) {
        console.warn(`⚠️ Şüpheli aktivite: ${userId} - ${reason}`);
        
        const key = `suspicious:${userId}`;
        const count = this.suspiciousActivities.get(key) || 0;
        this.suspiciousActivities.set(key, count + 1);
    }

    // Voice flood koruması
    checkVoiceFlood(userId, action) {
        const key = `voice:${userId}:${action}`;
        const now = Date.now();
        
        if (!this.voiceFloodCache.has(key)) {
            this.voiceFloodCache.set(key, []);
        }
        
        const actions = this.voiceFloodCache.get(key);
        const recentActions = actions.filter(time => now - time < 5000); // 5 saniye
        
        if (recentActions.length > 3) { // 5 saniyede 3'ten fazla
            this.logSuspiciousActivity(userId, `Voice flood: ${action}`);
            return false;
        }
        
        actions.push(now);
        this.voiceFloodCache.set(key, actions);
        return true;
    }

    // Input sanitization
    sanitizeInput(input, maxLength = 100) {
        if (typeof input !== 'string') return input;
        
        // Tehlikeli karakterleri temizle
        let sanitized = input
            .replace(/[<>]/g, '') // HTML injection
            .replace(/[\\'"`]/g, '') // SQL injection
            .replace(/\n\s*\n/g, '\n') // Çoklu satır sonları
            .trim();
        
        // Max uzunluk
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength) + '...';
        }
        
        return sanitized;
    }

    // Kanal adı validasyonu
    validateChannelName(name) {
        if (typeof name !== 'string') return false;
        
        // Min/Max uzunluk
        if (name.length < 2 || name.length > 100) return false;
        
        // İzin verilen karakterler
        const allowedPattern = /^[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s\-_.,!?@#$%&*()+=\[\]{}|:;"'<>~` ]+$/;
        if (!allowedPattern.test(name)) return false;
        
        return true;
    }

    // Cache temizleme
    cleanupOldCache() {
        const now = Date.now();
        
        // Rate limits temizle (1 saatten eski)
        for (const [key, timestamps] of this.rateLimits) {
            const valid = timestamps.filter(time => now - time < 3600000);
            if (valid.length === 0) {
                this.rateLimits.delete(key);
            } else {
                this.rateLimits.set(key, valid);
            }
        }
        
        // Voice flood cache temizle (5 dakikadan eski)
        for (const [key, actions] of this.voiceFloodCache) {
            const valid = actions.filter(time => now - time < 300000);
            if (valid.length === 0) {
                this.voiceFloodCache.delete(key);
            } else {
                this.voiceFloodCache.set(key, valid);
            }
        }
        
        // Şüpheli aktiviteleri temizle (24 saatten eski)
        for (const [key, count] of this.suspiciousActivities) {
            const [_, userId, timestamp] = key.split(':');
            if (now - parseInt(timestamp) > 86400000) {
                this.suspiciousActivities.delete(key);
            }
        }
    }

    // Bot güvenlik kontrolleri
    async checkBotPermissions(guild) {
        const botMember = await guild.members.fetch(this.client.user.id);
        const requiredPermissions = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.MoveMembers
        ];
        
        const missingPermissions = requiredPermissions.filter(
            perm => !botMember.permissions.has(perm)
        );
        
        return {
            hasAll: missingPermissions.length === 0,
            missing: missingPermissions
        };
    }

    // API istek limiti
    checkApiRequest(ip, endpoint) {
        const key = `api:${ip}:${endpoint}`;
        const now = Date.now();
        const window = 60000; // 1 dakika
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }
        
        const requests = this.rateLimits.get(key);
        const recent = requests.filter(time => now - time < window);
        
        if (recent.length > 60) { // Dakikada 60 istek
            return false;
        }
        
        requests.push(now);
        this.rateLimits.set(key, requests);
        return true;
    }
}

module.exports = SecuritySystem;