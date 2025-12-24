const { EmbedBuilder, Colors } = require('discord.js');

class EmbedManager {
    constructor() {
        this.colors = {
            primary: 0x5865F2,    // Discord mavisi
            success: 0x57F287,    // Yeşil
            error: 0xED4245,      // Kırmızı
            warning: 0xFEE75C,    // Sarı
            info: 0x3498DB,       // Mavi
            premium: 0xFFD700,    // Altın
            dark: 0x2C2F33,       // Koyu
            purple: 0x9B59B6,     // Mor
            orange: 0xE67E22,     // Turuncu
            pink: 0xE91E63        // Pembe
        };
        
        this.themes = {
            '🔥': { color: 0xFF0000, name: 'Kırmızı Tema' },
            '💜': { color: 0x9B59B6, name: 'Mor Tema' },
            '💙': { color: 0x3498DB, name: 'Mavi Tema' }
        };
    }

    // ==================== SETUP EMBED'LERİ ====================

    createSetupEmbed(guild, user) {
        return new EmbedBuilder()
            .setTitle('🎧 **PREMIUM** Özel Ses Odası Sistemi')
            .setDescription(`**${guild.name}** sunucusuna hoş geldiniz!`)
            .setColor(this.colors.primary)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
            .addFields(
                {
                    name: '🚀 **Başlamak Çok Kolay**',
                    value: '*1️⃣** Aşağıdaki butona tıkla\n**2️⃣** Ses kanalın otomatik oluşturulsun\n**3️⃣** Panelle odanı özelleştir\n**4️⃣** Arkadaşlarını davet et!',
                    inline: false
                },
                {
                    name: '⚡ **Premium Özellikler**',
                    value: '• ✨ **3 Farklı Tema** (🔥💜💙)\n• 🎮 **4 Oda Türü** (Valorant, Roblox, Sohbet, Müzik)\n• 🔧 **Gelişmiş Kontrol Paneli**\n• 🛡️ **AFK Koruma Sistemi**\n• 📊 **Web Dashboard Erişimi**\n• ⚡ **Otomatik Temizlik**',
                    inline: true
                },
                {
                    name: '🎯 **Öne Çıkanlar**',
                    value: '• 🔄 **Sahip Değiştirme**\n• 🔒 **Akıllı Kilitleme**\n• 🔊 **Bitrate Kontrolü**\n• 👥 **Üye Yönetimi**\n• 📱 **Mobil Uyumlu**\n• 🆓 **Tamamen Ücretsiz**',
                    inline: true
                }
            )
            .setImage('https://i.imgur.com/2Z4Bz0h.png') // Özel banner
            .setFooter({ 
                text: `Kurulum: ${user?.tag || 'Sistem'} • ${new Date().getFullYear()}`, 
                iconURL: user?.displayAvatarURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
            })
            .setTimestamp();
    }

    createSetupSuccessEmbed(guild, category, channel, settings) {
        return new EmbedBuilder()
            .setColor(this.colors.success)
            .setTitle('✅ **Kurulum Tamamlandı!**')
            .setDescription('Premium özel ses odası sistemi başarıyla kuruldu.')
            .addFields(
                { 
                    name: '📁 **Kategori**', 
                    value: `${category}\n\`${category.id}\``, 
                    inline: true 
                },
                { 
                    name: '📝 **Oluşturma Kanalı**', 
                    value: `${channel}\n\`${channel.id}\``, 
                    inline: true 
                },
                { 
                    name: '⚙️ **Varsayılan Ayarlar**', 
                    value: `**Limit:** ${settings.limit === 0 ? 'Sınırsız' : settings.limit}\n**Bitrate:** ${settings.bitrate}kbps\n**Max Oda:** ${settings.maxRooms}\n**Tema:** ${settings.theme}`, 
                    inline: false 
                },
                {
                    name: '🔗 **Hızlı Erişim**',
                    value: `[Kanalı Aç](${channel.url}) | [Dashboard](${process.env.WEBSITE_URL || 'http://localhost:3000'})`,
                    inline: false
                }
            )
            .setThumbnail(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
            .setFooter({ 
                text: `${guild.name} • Kurulum ID: ${Date.now().toString(36)}`, 
                iconURL: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
            })
            .setTimestamp();
    }

    createSetupExistingEmbed(existingGuild) {
        return new EmbedBuilder()
            .setColor(this.colors.warning)
            .setTitle('⚠️ Mevcut Kurulum Bulundu')
            .setDescription('Bu sunucuda zaten bir kurulum mevcut. Ne yapmak istersiniz?')
            .addFields(
                {
                    name: '📊 Mevcut Kurulum',
                    value: `**Kategori:** ${existingGuild.categoryId ? `<#${existingGuild.categoryId}>` : 'Bulunamadı'}\n**Kanal:** ${existingGuild.channelId ? `<#${existingGuild.channelId}>` : 'Bulunamadı'}`,
                    inline: false
                },
                {
                    name: '⚡ Seçenekler',
                    value: '**1️⃣ Yeniden Kur:** Eski kanalları silip yeniden kurar\n**2️⃣ Güncelle:** Mevcut kanalları günceller\n**3️⃣ Ayarları Değiştir:** Sadece ayarları değiştir\n**4️⃣ Kaldır:** Tüm sistemi kaldırır',
                    inline: false
                }
            )
            .setFooter({ text: '30 saniye içinde seçim yapın' })
            .setTimestamp();
    }

    // ==================== ODA CONTROL PANELİ ====================

    createRoomControlPanel(channel, room, owner, guild) {
        const themeColor = this.getThemeColor(room.theme);
        
        return new EmbedBuilder()
            .setTitle('🎛️ **ODA KONTROL PANELİ**')
            .setDescription(`**Sahip:** ${owner}\n**Oda:** ${channel}`)
            .setColor(themeColor)
            .setThumbnail(owner.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                {
                    name: '📊 **Oda Bilgileri**',
                    value: `**Durum:** ${room.locked ? '🔒 Kilitli' : '🔓 Açık'}\n**Limit:** ${room.userLimit === 0 ? 'Sınırsız' : room.userLimit} kişi\n**Bitrate:** ${Math.floor(room.bitrate / 1000)}kbps\n**Tema:** ${room.theme}\n**Tür:** ${room.roomType}`,
                    inline: true
                },
                {
                    name: '👥 **Katılımcılar**',
                    value: channel.members.size > 0 
                        ? channel.members.map(m => `• ${m}`).join('\n').slice(0, 200) + (channel.members.size > 8 ? '\n...' : '')
                        : '📭 Odada kimse yok',
                    inline: true
                },
                {
                    name: '⚡ **Hızlı Eylemler**',
                    value: 'Aşağıdaki butonlarla odanızı yönetebilirsiniz',
                    inline: false
                },
                {
                    name: '🕒 **Oluşturulma**',
                    value: `<t:${Math.floor(new Date(room.createdAt).getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '📈 **Aktivite**',
                    value: `<t:${Math.floor(new Date(room.lastActivity).getTime() / 1000)}:R>`,
                    inline: true
                }
            )
            .setImage(this.getRoomBanner(room.theme))
            .setFooter({ 
                text: `Oda ID: ${room.channelId.slice(-6)} • ${guild.name}`, 
                iconURL: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
            })
            .setTimestamp();
    }

    createRoomTypeSelectEmbed(channel, currentType) {
        const roomTypes = {
            'valorant': { emoji: '🎮', name: 'Valorant', desc: 'Oyun odası - Yüksek bitrate', color: 0xFF4655 },
            'roblox': { emoji: '🧱', name: 'Roblox', desc: 'Çocuk oyun odası', color: 0xFF6B6B },
            'chat': { emoji: '💬', name: 'Sohbet', desc: 'Arkadaşlarla sohbet', color: 0x5865F2 },
            'music': { emoji: '🎵', name: 'Müzik', desc: 'Müzik dinleme odası', color: 0x1DB954 }
        };

        const embed = new EmbedBuilder()
            .setTitle('🎮 Oda Türünü Seç')
            .setDescription(`**Mevcut tür:** ${currentType}\n\nAşağıdan yeni oda türünü seçin:`)
            .setColor(this.colors.primary);

        for (const [key, type] of Object.entries(roomTypes)) {
            embed.addFields({
                name: `${type.emoji} ${type.name}`,
                value: type.desc,
                inline: true
            });
        }

        embed.setFooter({ text: 'Seçtiğiniz tür otomatik uygulanacaktır' });
        
        return embed;
    }

    createThemeSelectEmbed(channel, currentTheme) {
        const embed = new EmbedBuilder()
            .setTitle('🎨 Tema Seç')
            .setDescription(`**Mevcut tema:** ${currentTheme}\n\nAşağıdan yeni temayı seçin:`)
            .setColor(this.getThemeColor(currentTheme));

        for (const [emoji, theme] of Object.entries(this.themes)) {
            embed.addFields({
                name: `${emoji} ${theme.name}`,
                value: `Renk: #${theme.color.toString(16).toUpperCase()}`,
                inline: true
            });
        }

        embed.setFooter({ text: 'Tema kanal adını ve panel rengini değiştirir' });
        
        return embed;
    }

    // ==================== AFK SİSTEMİ ====================

    createAfkWarningEmbed(member, afkTime, action) {
        return new EmbedBuilder()
            .setColor(this.colors.warning)
            .setTitle('⚠️ AFK Uyarısı')
            .setDescription(`${member}, ${afkTime} dakikadır AFK'sin!`)
            .addFields(
                {
                    name: '⏰ Süre',
                    value: `${afkTime} dakika`,
                    inline: true
                },
                {
                    name: '⚡ Aksiyon',
                    value: action === 'warn' ? 'Uyarı' : 'Atılma',
                    inline: true
                },
                {
                    name: '💡 Öneri',
                    value: 'Lütfen sesli kanala dönün veya çıkın.',
                    inline: false
                }
            )
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'AFK Koruma Sistemi' })
            .setTimestamp();
    }

    createAfkKickEmbed(member, afkTime) {
        return new EmbedBuilder()
            .setColor(this.colors.error)
            .setTitle('🚪 AFK Atılma')
            .setDescription(`${member}, ${afkTime} dakika AFK kaldığınız için kanaldan atıldınız.`)
            .addFields(
                {
                    name: '⏰ Toplam Süre',
                    value: `${afkTime} dakika`,
                    inline: true
                },
                {
                    name: '🔄 Yeniden Katılma',
                    value: 'Tekrar odaya katılabilirsiniz.',
                    inline: true
                },
                {
                    name: '⚙️ Ayarlar',
                    value: 'AFK süresini sunucu yöneticileri değiştirebilir.',
                    inline: false
                }
            )
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'AFK Koruma Sistemi' })
            .setTimestamp();
    }

    // ==================== BAŞARI/HATA MESAJLARI ====================

    createSuccessEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(this.colors.success)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    createErrorEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(this.colors.error)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    createInfoEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(this.colors.info)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    createWarningEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(this.colors.warning)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    // ==================== YARDIM & BİLGİ ====================

    createHelpEmbed(guild) {
        return new EmbedBuilder()
            .setColor(this.colors.primary)
            .setTitle('❓ LaGuts Bot - Yardım Menüsü')
            .setDescription('Gelişmiş özel ses odası botu için yardım menüsü')
            .setThumbnail(guild.client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '🎯 **Temel Komutlar**',
                    value: '`/setup` - Sistemi kur\n`/yardım` - Bu menüyü göster\n`/istatistik` - Bot istatistikleri',
                    inline: false
                },
                {
                    name: '⚡ **Oda Kontrolleri**',
                    value: '• **İsim Değiştir** - Odanın adını değiştir\n• **Limit Ayarla** - Kullanıcı limitini ayarla\n• **Kilitle/Aç** - Odayı kilitle veya aç\n• **Tema Seç** - 3 farklı temadan birini seç\n• **Oda Türü** - 4 farklı oda türü',
                    inline: false
                },
                {
                    name: '🔧 **Sistem Özellikleri**',
                    value: '• 🛡️ **AFK Koruma** - Ayarlanabilir AFK sistemi\n• 🧹 **Otomatik Temizlik** - Boş odalar silinir\n• 🔄 **Sahip Değiştirme** - Sahip çıkarsa otomatik devir\n• 🌐 **Web Dashboard** - Online yönetim paneli\n• 🎨 **Tema Sistemi** - 3 farklı görsel tema',
                    inline: false
                },
                {
                    name: '📱 **Destek & İletişim**',
                    value: '• [🌐 Web Sitesi](' + (process.env.WEBSITE_URL || 'http://localhost:3000') + ')\n• [🐛 Hata Bildir](https://github.com/)\n• [💡 Öneri Gönder](https://github.com/)',
                    inline: false
                }
            )
            .setFooter({ 
                text: `${guild.client.user.username} • v2.0.0`, 
                iconURL: guild.client.user.displayAvatarURL() 
            })
            .setTimestamp();
    }

    createStatsEmbed(client, stats) {
        const memory = process.memoryUsage();
        const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
        const totalMB = Math.round(memory.heapTotal / 1024 / 1024);
        
        const uptime = this.formatUptime(client.uptime);

        return new EmbedBuilder()
            .setColor(this.colors.premium)
            .setTitle('📊 **Bot İstatistikleri**')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '🤖 **Bot Bilgileri**',
                    value: `**Ping:** ${client.ws.ping}ms\n**Çalışma Süresi:** ${uptime}\n**Hafıza:** ${usedMB}MB / ${totalMB}MB\n**Versiyon:** v2.0.0`,
                    inline: true
                },
                {
                    name: '🌐 **Sunucu İstatistikleri**',
                    value: `**Toplam Sunucu:** ${stats.totalGuilds || 0}\n**Aktif Odalar:** ${stats.totalRooms || 0}\n**Discord Sunucuları:** ${client.guilds.cache.size}\n**Kullanıcılar:** ${client.users.cache.size}`,
                    inline: true
                },
                {
                    name: '⚡ **Performans**',
                    value: `**Kanallar:** ${client.channels.cache.size}\n**Emojiler:** ${client.emojis.cache.size}\n**Node.js:** ${process.version}\n**Platform:** ${process.platform}`,
                    inline: true
                },
                {
                    name: '🎮 **Sistem Özellikleri**',
                    value: '• 🆓 Tamamen Ücretsiz\n• ♾️ Sınırsız Oda\n• 🎨 3 Farklı Tema\n• 🎮 4 Oda Türü\n• 🛡️ AFK Sistemi\n• 🌐 Web Panel\n• 🔒 Gelişmiş Güvenlik',
                    inline: false
                }
            )
            .setFooter({ 
                text: `© ${client.user.username} | ${new Date().getFullYear()}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();
    }

    // ==================== WEB DASHBOARD ====================

    createDashboardEmbed(user, guilds) {
        return new EmbedBuilder()
            .setColor(this.colors.primary)
            .setTitle('🌐 **Web Dashboard**')
            .setDescription('Botu web üzerinden yönetmek için dashboard\'u kullanın')
            .addFields(
                {
                    name: '🔗 **Bağlantı**',
                    value: `[Dashboard'u Aç](${process.env.WEBSITE_URL || 'http://localhost:3000'})`,
                    inline: false
                },
                {
                    name: '⚡ **Özellikler**',
                    value: '• Sunucu ayarlarını yönet\n• Oda istatistiklerini gör\n• AFK sistemini ayarla\n• Tema ve limit ayarları\n• Premium özellikler',
                    inline: false
                },
                {
                    name: '📱 **Erişim**',
                    value: `Dashboard'a erişmek için Discord hesabınızla giriş yapın.`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `${user.username} için dashboard bilgileri`, 
                iconURL: user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();
    }

    // ==================== LOG & AUDIT ====================

    createAuditLogEmbed(action, user, details) {
        const actionColors = {
            'create': this.colors.success,
            'update': this.colors.info,
            'delete': this.colors.error,
            'warning': this.colors.warning,
            'kick': this.colors.error,
            'ban': 0x000000,
            'mute': this.colors.warning
        };

        const actionIcons = {
            'create': '✅',
            'update': '⚡',
            'delete': '🗑️',
            'warning': '⚠️',
            'kick': '👢',
            'ban': '🔨',
            'mute': '🔇'
        };

        return new EmbedBuilder()
            .setColor(actionColors[action] || this.colors.primary)
            .setTitle(`${actionIcons[action] || '📝'} ${action.toUpperCase()} Log`)
            .setDescription(`**Kullanıcı:** ${user.tag} (\`${user.id}\`)`)
            .addFields(
                {
                    name: '📋 Detaylar',
                    value: details,
                    inline: false
                },
                {
                    name: '🕒 Zaman',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                }
            )
            .setFooter({ 
                text: 'LaGuts Bot Audit Log', 
                iconURL: user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();
    }

    // ==================== UTILITY FUNCTIONS ====================

    getThemeColor(themeEmoji) {
        return this.themes[themeEmoji]?.color || this.colors.primary;
    }

    getRoomBanner(themeEmoji) {
        const banners = {
            '🔥': 'https://i.imgur.com/2Z4Bz0h.png',
            '💜': 'https://i.imgur.com/8J7vQ6a.png',
            '💙': 'https://i.imgur.com/9X8vQ2b.png'
        };
        return banners[themeEmoji] || 'https://i.imgur.com/2Z4Bz0h.png';
    }

    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}g`);
        if (hours > 0) parts.push(`${hours}s`);
        if (minutes > 0) parts.push(`${minutes}d`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}sn`);

        return parts.join(' ');
    }

    createProgressBar(current, max, length = 10) {
        const percentage = current / max;
        const filled = Math.round(length * percentage);
        const empty = length - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
    }

    createTable(data, headers) {
        const rows = data.map(row => {
            return headers.map(header => row[header] || '').join(' | ');
        });
        
        return `\`\`\`\n${headers.join(' | ')}\n${'-'.repeat(headers.join(' | ').length)}\n${rows.join('\n')}\n\`\`\``;
    }

    // ==================== SPECIALIZED EMBEDS ====================

    createRoomCreatedEmbed(channel, owner) {
        return new EmbedBuilder()
            .setColor(this.colors.success)
            .setTitle('🎉 **Oda Oluşturuldu!**')
            .setDescription(`${owner}, özel ses odan başarıyla oluşturuldu!`)
            .addFields(
                {
                    name: '📁 Oda',
                    value: `${channel}`,
                    inline: true
                },
                {
                    name: '👤 Sahip',
                    value: `${owner}`,
                    inline: true
                },
                {
                    name: '⚡ Özellikler',
                    value: '• İsim değiştirebilirsin\n• Limit ayarlayabilirsin\n• Odayı kilitleyebilirsin\n• Tema seçebilirsin\n• Üyeleri yönetebilirsin',
                    inline: false
                }
            )
            .setThumbnail(owner.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Oda kontrol paneli kanalda görünecektir' })
            .setTimestamp();
    }

    createRoomDeletedEmbed(channelName, reason) {
        return new EmbedBuilder()
            .setColor(this.colors.error)
            .setTitle('🗑️ **Oda Silindi**')
            .setDescription(`**${channelName}** odası silindi.`)
            .addFields(
                {
                    name: '📝 Sebep',
                    value: reason || 'Otomatik temizlik',
                    inline: true
                },
                {
                    name: '🕒 Zaman',
                    value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                    inline: true
                }
            )
            .setFooter({ text: 'Boş odalar otomatik olarak silinir' })
            .setTimestamp();
    }

    createOwnerTransferEmbed(oldOwner, newOwner, channel) {
        return new EmbedBuilder()
            .setColor(this.colors.info)
            .setTitle('👑 **Oda Sahipliği Devredildi**')
            .setDescription(`${oldOwner}, odanın sahipliğini ${newOwner} kullanıcısına devretti.`)
            .addFields(
                {
                    name: '📁 Oda',
                    value: `${channel}`,
                    inline: true
                },
                {
                    name: '👤 Eski Sahip',
                    value: `${oldOwner}`,
                    inline: true
                },
                {
                    name: '👑 Yeni Sahip',
                    value: `${newOwner}`,
                    inline: true
                }
            )
            .setThumbnail(newOwner.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Yeni sahip odanın tüm kontrollerine sahip olur' })
            .setTimestamp();
    }

    createUserKickedEmbed(kickedUser, moderator, reason, channel) {
        return new EmbedBuilder()
            .setColor(this.colors.error)
            .setTitle('🚪 **Kullanıcı Odadan Atıldı**')
            .setDescription(`${kickedUser}, ${channel} odasından atıldı.`)
            .addFields(
                {
                    name: '👤 Atan Kişi',
                    value: `${moderator}`,
                    inline: true
                },
                {
                    name: '📝 Sebep',
                    value: reason || 'Belirtilmedi',
                    inline: true
                },
                {
                    name: '⏰ Süre',
                    value: '10 dakika boyunca odaya giremez',
                    inline: true
                }
            )
            .setThumbnail(kickedUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Oda sahibi kullanıcıları yönetebilir' })
            .setTimestamp();
    }

    // ==================== PREMIUM FEATURES ====================

    createPremiumFeaturesEmbed() {
        return new EmbedBuilder()
            .setColor(this.colors.premium)
            .setTitle('🌟 **Premium Özellikler**')
            .setDescription('LaGuts Bot\'un gelişmiş premium özellikleri')
            .setThumbnail('https://cdn.discordapp.com/emojis/1064020579860156416.gif')
            .addFields(
                {
                    name: '🎨 **Görsel Özellikler**',
                    value: '• 3 Farklı tema (🔥💜💙)\n• Özel oda bannerları\n• Renk kodlu paneller\n• Animasyonlu ikonlar',
                    inline: true
                },
                {
                    name: '⚡ **Performans**',
                    value: '• Hızlı oda oluşturma\n• Düşük gecikme\n• Stabil bağlantı\n• 7/24 çalışma',
                    inline: true
                },
                {
                    name: '🔧 **Gelişmiş Kontroller**',
                    value: '• Detaylı oda istatistikleri\n• Kullanıcı geçmişi\n• Otomatik backup\n• Web dashboard',
                    inline: true
                },
                {
                    name: '🛡️ **Güvenlik**',
                    value: '• Gelişmiş AFK sistemi\n• Spam koruması\n• Anti-raid önlemleri\n• Otomatik moderasyon',
                    inline: true
                },
                {
                    name: '📊 **Analitik**',
                    value: '• Detaylı kullanım raporları\n• Oda istatistikleri\n• Kullanıcı aktiviteleri\n• Performans metrikleri',
                    inline: true
                }
            )
            .setImage('https://i.imgur.com/8J7vQ6a.png')
            .setFooter({ text: 'LaGuts Bot Premium • v2.0.0' })
            .setTimestamp();
    }
}

// Export singleton instance
const embedManager = new EmbedManager();
module.exports = embedManager;