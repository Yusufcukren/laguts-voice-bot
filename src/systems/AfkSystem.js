const { EmbedBuilder } = require('discord.js');

class AfkSystem {
    constructor(client) {
        this.client = client;
        this.afkUsers = new Map();
        this.afkChecks = new Map();
        
        // Her dakika AFK kontrolü yap
        setInterval(() => this.checkAfkUsers(), 60000);
    }

    async setUserAfk(member, reason = 'AFK') {
        this.afkUsers.set(member.id, {
            guildId: member.guild.id,
            channelId: member.voice.channel?.id,
            startTime: Date.now(),
            reason: reason,
            originalNickname: member.nickname || member.user.username
        });

        // Kullanıcının adını güncelle (opsiyonel)
        try {
            if (member.manageable) {
                const newNickname = `[AFK] ${member.displayName.slice(0, 26)}`;
                await member.setNickname(newNickname);
            }
        } catch (error) {
            // Yetki yoksa atla
        }

        return true;
    }

    async removeUserAfk(member) {
        if (!this.afkUsers.has(member.id)) return false;

        const afkData = this.afkUsers.get(member.id);
        this.afkUsers.delete(member.id);

        // Kullanıcının adını eski haline getir
        try {
            if (member.manageable && member.nickname?.startsWith('[AFK] ')) {
                await member.setNickname(afkData.originalNickname);
            }
        } catch (error) {
            // Yetki yoksa atla
        }

        return true;
    }

    async checkAfkUsers() {
        for (const [userId, afkData] of this.afkUsers) {
            try {
                const guild = this.client.guilds.cache.get(afkData.guildId);
                if (!guild) {
                    this.afkUsers.delete(userId);
                    continue;
                }

                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) {
                    this.afkUsers.delete(userId);
                    continue;
                }

                const guildData = await this.client.db.getGuild(guild.id);
                if (!guildData.afkEnabled || guildData.afkAction === 'none') continue;

                const afkDuration = Date.now() - afkData.startTime;
                const afkMinutes = Math.floor(afkDuration / 60000);

                if (afkMinutes >= guildData.afkTime) {
                    await this.handleAfkAction(member, guildData, afkData);
                }
            } catch (error) {
                console.error('AFK kontrol hatası:', error);
            }
        }
    }

    async handleAfkAction(member, guildData, afkData) {
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            this.afkUsers.delete(member.id);
            return;
        }

        const room = await this.client.db.getVoiceRoom(voiceChannel.id);
        if (!room) return;

        switch (guildData.afkAction) {
            case 'warn':
                // Uyarı gönder
                try {
                    const embed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle('⚠️ AFK Uyarısı')
                        .setDescription(`${member}, ${guildData.afkTime} dakikadır AFK'sin!`)
                        .setFooter({ text: 'Lütfen sesli kanala dönün veya çıkın.' })
                        .setTimestamp();
                    
                    await voiceChannel.send({ embeds: [embed] }).catch(() => {});
                } catch (error) {
                    // Mesaj gönderilemeyebilir
                }
                break;

            case 'kick':
                // Sesten at
                try {
                    await member.voice.disconnect('AFK olduğun için kanaldan atıldın');
                    this.afkUsers.delete(member.id);
                    
                    if (room.ownerId === member.id) {
                        // Oda sahibi AFK olduysa, sahipliği devret
                        await this.client.tempVoiceSystem.handleOwnerLeft(voiceChannel);
                    }
                    
                    // Bildirim gönder
                    try {
                        const embed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('🚪 AFK Atılma')
                            .setDescription(`${member}, ${guildData.afkTime} dakika AFK kaldığınız için kanaldan atıldınız.`)
                            .setFooter({ text: 'Tekrar katılmak için odanıza geri dönebilirsiniz.' })
                            .setTimestamp();
                        
                        await member.send({ embeds: [embed] }).catch(() => {});
                    } catch (error) {
                        // DM gönderilemezse atla
                    }
                } catch (error) {
                    console.error('AFK kick hatası:', error);
                }
                break;
        }
    }

    async handleVoiceStateUpdate(oldState, newState) {
        try {
            // Kullanıcı konuşmaya başladıysa AFK'dan çıkar
            if (oldState.serverMute !== newState.serverMute || 
                oldState.selfMute !== newState.selfMute) {
                
                if (newState.serverMute === false && newState.selfMute === false) {
                    if (this.afkUsers.has(newState.id)) {
                        await this.removeUserAfk(newState.member);
                        try {
                            const embed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle('✅ AFK Modundan Çıkıldı')
                                .setDescription(`${newState.member}, AFK modundan çıktınız!`)
                                .setTimestamp();
                            
                            await newState.channel?.send({ embeds: [embed] }).catch(() => {});
                        } catch (error) {
                            // Mesaj gönderilemeyebilir
                        }
                    }
                } else if ((newState.serverMute || newState.selfMute) && 
                          newState.channel && 
                          !this.afkUsers.has(newState.id)) {
                    // Kullanıcı sessize alındıysa AFK yap
                    await this.setUserAfk(newState.member, 'Sessiz');
                }
            }

            // Kanal değişikliği
            if (oldState.channelId !== newState.channelId) {
                if (this.afkUsers.has(newState.id)) {
                    await this.removeUserAfk(newState.member);
                }
            }
            
            // Kullanıcı susturulduysa AFK'ya al
            if (newState.serverMute || newState.selfMute) {
                if (!this.afkUsers.has(newState.id) && newState.channel) {
                    setTimeout(() => {
                        if (newState.channel && (newState.serverMute || newState.selfMute)) {
                            this.setUserAfk(newState.member, 'Susturuldu');
                        }
                    }, 30000); // 30 saniye sonra
                }
            }
            
        } catch (error) {
            console.error('AFK voice state update hatası:', error);
        }
    }

    isUserAfk(userId) {
        return this.afkUsers.has(userId);
    }

    getAfkData(userId) {
        return this.afkUsers.get(userId);
    }
}

module.exports = AfkSystem;