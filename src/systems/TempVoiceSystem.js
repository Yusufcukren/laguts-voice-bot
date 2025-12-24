const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

class TempVoiceSystem {
    constructor(client) {
        this.client = client;
        this.cooldowns = new Map();
        this.roomPanels = new Map();
        this.themeColors = {
            'red': 0x8B0000,    // LaGuts kırmızısı
            'purple': 0x8A2BE2, // Premium mor
            'blue': 0x1E90FF    // Standart mavi
        };
        this.themeEmojis = {
            'red': '🔴',
            'purple': '💜',
            'blue': '💙'
        };
    }

    async createVoiceRoom(interaction) {
        const member = interaction.member;
        const guild = interaction.guild;
        
        // Cooldown kontrolü
        if (this.cooldowns.has(member.id)) {
            const cooldown = this.cooldowns.get(member.id);
            if (Date.now() < cooldown) {
                const timeLeft = Math.ceil((cooldown - Date.now()) / 1000);
                await interaction.reply({
                    content: `⏳ **LaGuts Cooldown:** ${timeLeft}s sonra tekrar deneyin!`,
                    ephemeral: true
                });
                return;
            }
        }

        // Premium kontrolü
        const isPremium = await this.client.db.isPremium(guild.id);
        const guildData = await this.client.db.getGuild(guild.id);
        
        if (!isPremium) {
            const activeRooms = await this.client.db.getGuildRooms(guild.id);
            if (activeRooms.length >= guildData.maxRooms) {
                await interaction.reply({
                    content: '❌ **Ücretsiz Sınır:** Sadece 1 aktif oda açabilirsiniz!\n\n**LaGuts Premium** almak için:\n`/premium bilgi`',
                    ephemeral: true
                });
                return;
            }
        }

        // Kategori kontrolü
        if (!guildData.categoryId) {
            await interaction.reply({
                content: '❌ **Sistem Kurulu Değil!**\nÖnce `/setup` komutu ile LaGuts sistemini kurun.',
                ephemeral: true
            });
            return;
        }

        try {
            // Ses kanalı oluştur (LaGuts teması ile)
            const channelName = `${guildData.theme} ${member.user.username}'in Odası`;
            const voiceChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: guildData.categoryId,
                bitrate: isPremium ? guildData.defaultBitrate : 64000,
                userLimit: guildData.defaultUserLimit,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.Connect]
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.Stream,
                            PermissionFlagsBits.UseEmbeddedActivities
                        ]
                    }
                ]
            });

            // Kullanıcıyı kanala taşı
            if (member.voice.channel) {
                await member.voice.setChannel(voiceChannel);
            }

            // Veritabanına kaydet
            await this.client.db.createVoiceRoom({
                channelId: voiceChannel.id,
                guildId: guild.id,
                ownerId: member.id,
                name: member.user.username,
                bitrate: guildData.defaultBitrate,
                userLimit: guildData.defaultUserLimit,
                theme: guildData.theme,
                roomType: '💬 Sohbet'
            });

            // LaGuts kontrol paneli oluştur
            await this.createLaGutsControlPanel(voiceChannel, member);

            // Cooldown ekle
            this.cooldowns.set(member.id, Date.now() + 30000);

            await interaction.reply({
                content: `🎚️ **LaGuts Oda Oluşturuldu!**\n\n${voiceChannel} odan hazır!\n⚡ Kontrol paneli kanalda görünüyor.`,
                ephemeral: true
            });

            // Log
            console.log(`🎚️ LaGuts Oda: ${member.user.tag} için oda oluşturuldu (${voiceChannel.id})`);

        } catch (error) {
            console.error('LaGuts voice room error:', error);
            await interaction.reply({
                content: '❌ **LaGuts Hatası:** Oda oluşturulamadı!',
                ephemeral: true
            });
        }
    }

    async createLaGutsControlPanel(channel, owner) {
        const room = await this.client.db.getVoiceRoom(channel.id);
        const isPremium = await this.client.db.isPremium(channel.guild.id);
        
        const themeColor = this.themeColors[room.theme === '🔴' ? 'red' : room.theme === '💜' ? 'purple' : 'blue'] || this.client.brand.color;

        const embed = new EmbedBuilder()
            .setTitle('🎚️ LA GUTS KONTROL PANELİ')
            .setDescription(`**Sahip:** ${owner}\n**Oda:** ${channel}\n**Durum:** ${room.locked ? '🔒 Kilitli' : '🔓 Açık'}`)
            .setColor(themeColor)
            .setThumbnail(owner.displayAvatarURL())
            .addFields(
                {
                    name: '📊 ODA BİLGİLERİ',
                    value: `**Tür:** ${room.roomType}\n**Limit:** ${room.userLimit === 0 ? 'Sınırsız' : room.userLimit}\n**Bitrate:** ${room.bitrate / 1000}kbps\n**Tema:** ${room.theme}`,
                    inline: true
                },
                {
                    name: '👥 ÜYELER',
                    value: `**Aktif:** ${channel.members.size}\n**Kapasite:** ${room.userLimit === 0 ? '∞' : room.userLimit}`,
                    inline: true
                },
                {
                    name: '⚡ LA GUTS FEATURES',
                    value: isPremium ? '✅ Premium Aktif' : '🔓 Premium Gerekli',
                    inline: true
                }
            )
            .setFooter({ 
                text: `🎚️ LaGuts v${this.client.brand.version} | Panel 5 dakika sonra kaybolur`,
                iconURL: this.client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Ana Kontrol Butonları (LaGuts Temalı)
        const mainButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`voice_rename_${channel.id}`)
                    .setLabel('İsim Değiştir')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId(`voice_limit_${channel.id}`)
                    .setLabel('Limit Ayarla')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId(`voice_lock_${channel.id}`)
                    .setLabel(room.locked ? 'Kilidi Aç' : 'Kilitle')
                    .setStyle(room.locked ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji(room.locked ? '🔓' : '🔒'),
                new ButtonBuilder()
                    .setCustomId(`voice_kick_${channel.id}`)
                    .setLabel('Üye Yönet')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId(`voice_transfer_${channel.id}`)
                    .setLabel('Sahipliği Devret')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👑')
            );

        // Premium Butonlar
        const premiumButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`voice_bitrate_${channel.id}`)
                    .setLabel('Bitrate')
                    .setStyle(isPremium ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji('🎚️')
                    .setDisabled(!isPremium),
                new ButtonBuilder()
                    .setCustomId(`voice_invite_${channel.id}`)
                    .setLabel('Davet Oluştur')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📨'),
                new ButtonBuilder()
                    .setCustomId(`voice_afk_${channel.id}`)
                    .setLabel('AFK Ayarları')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏰'),
                new ButtonBuilder()
                    .setCustomId(`voice_info_${channel.id}`)
                    .setLabel('Oda Bilgisi')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️'),
                new ButtonBuilder()
                    .setCustomId(`voice_delete_${channel.id}`)
                    .setLabel('Odayı Sil')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        // Select Menu - Oda Türü
        const roomTypeSelect = new StringSelectMenuBuilder()
            .setCustomId(`room_type_${channel.id}`)
            .setPlaceholder('🎚️ Oda türünü seç...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎮 VALORANT')
                    .setValue('valorant')
                    .setDescription('Yüksek kalite oyun odası')
                    .setEmoji('🎮'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🧱 ROBLOX')
                    .setValue('roblox')
                    .setDescription('Eğlence odası')
                    .setEmoji('🧱'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💬 LA GUTS SOHBET')
                    .setValue('chat')
                    .setDescription('Premium sohbet odası')
                    .setEmoji('💬'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎵 MÜZİK PARTİ')
                    .setValue('music')
                    .setDescription('Yüksek bitrate müzik odası')
                    .setEmoji('🎵'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📚 ÇALIŞMA')
                    .setValue('study')
                    .setDescription('Sessiz çalışma odası')
                    .setEmoji('📚')
            );

        const typeRow = new ActionRowBuilder().addComponents(roomTypeSelect);

        // Select Menu - Tema
        const themeSelect = new StringSelectMenuBuilder()
            .setCustomId(`room_theme_${channel.id}`)
            .setPlaceholder('🎨 LaGuts teması seç...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔴 LA GUTS RED')
                    .setValue('red')
                    .setDescription('Exclusive LaGuts teması')
                    .setEmoji('🔴'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💜 PREMIUM PURPLE')
                    .setValue('purple')
                    .setDescription('Premium üye teması')
                    .setEmoji('💜'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💙 STANDARD BLUE')
                    .setValue('blue')
                    .setDescription('Standart tema')
                    .setEmoji('💙')
            )
            .setDisabled(!isPremium);

        const themeRow = new ActionRowBuilder().addComponents(themeSelect);

        try {
            const message = await channel.send({
                content: '** **\n**🎚️ LA GUTS KONTROL PANELİ AKTİF!**\n*Premium özellikler hazır*',
                embeds: [embed],
                components: [mainButtons, premiumButtons, typeRow, themeRow]
            });

            this.roomPanels.set(channel.id, message);

            // 5 dakika sonra paneli güncelle (silme yerine güncelleme)
            setTimeout(async () => {
                try {
                    const newEmbed = EmbedBuilder.from(embed)
                        .setFooter({ 
                            text: `⚠️ Panel süresi doldu! Butona tıklayarak yenileyin.`,
                            iconURL: this.client.user.displayAvatarURL()
                        });
                    
                    await message.edit({
                        embeds: [newEmbed],
                        components: []
                    });
                    
                    this.roomPanels.delete(channel.id);
                } catch (error) {
                    console.error('Panel güncelleme hatası:', error);
                }
            }, 300000);

        } catch (error) {
            console.error('LaGuts panel oluşturma hatası:', error);
        }
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        try {
            if (customId.startsWith('voice_rename_')) {
                await this.showRenameModal(interaction);
            } else if (customId.startsWith('voice_limit_')) {
                await this.showLimitModal(interaction);
            } else if (customId.startsWith('voice_lock_')) {
                await this.handleLock(interaction);
            } else if (customId.startsWith('voice_kick_')) {
                await this.showKickMenu(interaction);
            } else if (customId.startsWith('voice_transfer_')) {
                await this.showTransferMenu(interaction);
            } else if (customId.startsWith('voice_bitrate_')) {
                await this.showBitrateModal(interaction);
            } else if (customId.startsWith('voice_delete_')) {
                await this.deleteRoom(interaction);
            }
            
            // Panel mesajını güncelle
            const channelId = customId.split('_')[2];
            const message = this.roomPanels.get(channelId);
            if (message) {
                await this.updateControlPanel(channelId);
            }
            
        } catch (error) {
            console.error('Button interaction error:', error);
            await interaction.reply({
                content: '❌ İşlem sırasında hata oluştu!',
                ephemeral: true
            });
        }
    }

    async showRenameModal(interaction) {
        const channelId = interaction.customId.split('_')[2];
        const room = await this.client.db.getVoiceRoom(channelId);
        
        if (!room || room.ownerId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ Bu işlemi sadece **oda sahibi** yapabilir!',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_rename_${channelId}`)
            .setTitle('🎚️ Oda İsmini Değiştir');

        const nameInput = new TextInputBuilder()
            .setCustomId('room_name')
            .setLabel('Yeni oda ismi (max 32 karakter)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: LaGuts Gaming Room')
            .setMaxLength(32)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    async handleModalSubmit(interaction) {
        if (interaction.customId.startsWith('modal_rename_')) {
            const channelId = interaction.customId.split('_')[2];
            const roomName = interaction.fields.getTextInputValue('room_name');
            
            const room = await this.client.db.getVoiceRoom(channelId);
            if (!room || room.ownerId !== interaction.user.id) return;
            
            const channel = interaction.guild.channels.cache.get(channelId);
            if (channel) {
                await channel.setName(`${room.theme} ${roomName}`);
                await room.update({ name: roomName });
                
                await interaction.reply({
                    content: `✅ Oda ismi **${roomName}** olarak değiştirildi!`,
                    ephemeral: true
                });
            }
        }
    }

    async handleLock(interaction) {
        const channelId = interaction.customId.split('_')[2];
        const room = await this.client.db.getVoiceRoom(channelId);
        
        if (!room || room.ownerId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ Bu işlemi sadece **oda sahibi** yapabilir!',
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        const isLocked = room.locked;
        
        if (isLocked) {
            // Kanalı aç
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                Connect: null
            });
            await room.update({ locked: false });
            
            await interaction.reply({
                content: '🔓 **LaGuts Oda Kilidi Açıldı!**',
                ephemeral: true
            });
        } else {
            // Kanalı kilitle
            await channel.permissionOverwrites.edit(interaction.guild.id, {
                Connect: false
            });
            await room.update({ locked: true });
            
            await interaction.reply({
                content: '🔒 **LaGuts Oda Kilitlendi!**',
                ephemeral: true
            });
        }
    }

    async handleRoomTypeSelect(interaction) {
        const channelId = interaction.customId.split('_')[2];
        const room = await this.client.db.getVoiceRoom(channelId);
        
        if (!room || room.ownerId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ Bu işlemi sadece **oda sahibi** yapabilir!',
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        const selected = interaction.values[0];
        
        let newName, bitrate, userLimit;
        
        switch (selected) {
            case 'valorant':
                newName = 'VALORANT';
                bitrate = 96000;
                userLimit = 5;
                break;
            case 'roblox':
                newName = 'ROBLOX';
                bitrate = 64000;
                userLimit = 10;
                break;
            case 'music':
                newName = 'MÜZİK PARTİ';
                bitrate = 128000;
                userLimit = 0;
                break;
            case 'study':
                newName = 'ÇALIŞMA';
                bitrate = 32000;
                userLimit = 5;
                break;
            default:
                newName = 'LA GUTS SOHBET';
                bitrate = 64000;
                userLimit = 10;
        }

        if (channel) {
            await channel.setName(`${room.theme} ${newName}`);
            await channel.setBitrate(bitrate);
            await channel.setUserLimit(userLimit);
            
            await room.update({ 
                name: newName, 
                bitrate, 
                userLimit,
                roomType: selected 
            });
            
            await interaction.reply({
                content: `🎚️ **Oda türü "${newName}" olarak ayarlandı!**`,
                ephemeral: true
            });
        }
    }

    async handleRoomThemeSelect(interaction) {
        const channelId = interaction.customId.split('_')[2];
        const room = await this.client.db.getVoiceRoom(channelId);
        
        if (!room || room.ownerId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ Bu işlemi sadece **oda sahibi** yapabilir!',
                ephemeral: true
            });
        }

        // Premium kontrolü
        const isPremium = await this.client.db.isPremium(interaction.guild.id);
        if (!isPremium && interaction.values[0] !== 'blue') {
            return await interaction.reply({
                content: '❌ **Premium Gerekli!**\nSadece standart tema kullanabilirsiniz.\n\n`/premium` komutu ile premium alın!',
                ephemeral: true
            });
        }

        const selected = interaction.values[0];
        const themeEmoji = this.themeEmojis[selected];
        const themeColor = this.themeColors[selected];
        
        const channel = interaction.guild.channels.cache.get(channelId);
        if (channel) {
            // Kanal adındaki temayı güncelle
            const currentName = channel.name;
            const newName = currentName.replace(/^[🔴💜💙] /, `${themeEmoji} `);
            
            await channel.setName(newName);
            await room.update({ theme: themeEmoji });
            
            await interaction.reply({
                content: `🎨 **Tema "${themeEmoji}" olarak değiştirildi!**`,
                ephemeral: true
            });
            
            // Panel embed rengini güncelle
            await this.updateControlPanel(channelId);
        }
    }

    async updateControlPanel(channelId) {
        const message = this.roomPanels.get(channelId);
        if (!message) return;

        try {
            const channel = message.channel;
            const room = await this.client.db.getVoiceRoom(channelId);
            if (!room || !channel) return;

            const owner = await channel.guild.members.fetch(room.ownerId).catch(() => null);
            await this.createLaGutsControlPanel(channel, owner);
            
            // Eski mesajı sil
            await message.delete().catch(() => {});
            
        } catch (error) {
            console.error('Panel güncelleme hatası:', error);
        }
    }

    async deleteRoom(interaction) {
        const channelId = interaction.customId.split('_')[2];
        const room = await this.client.db.getVoiceRoom(channelId);
        
        if (!room || room.ownerId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ Bu işlemi sadece **oda sahibi** yapabilir!',
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        if (channel) {
            await channel.delete();
            await this.client.db.deleteVoiceRoom(channelId);
            this.roomPanels.delete(channelId);
            
            await interaction.reply({
                content: '🗑️ **LaGuts oda başarıyla silindi!**',
                ephemeral: true
            });
        }
    }

    async cleanupEmptyRooms(guild) {
        const rooms = await this.client.db.getGuildRooms(guild.id);
        
        for (const room of rooms) {
            const channel = guild.channels.cache.get(room.channelId);
            
            if (!channel) {
                // Kanal silinmiş
                await this.client.db.deleteVoiceRoom(room.channelId);
                this.roomPanels.delete(room.channelId);
                continue;
            }
            
            if (channel.members.size === 0) {
                // Boş odayı sil
                try {
                    await channel.delete();
                    await this.client.db.deleteVoiceRoom(room.channelId);
                    this.roomPanels.delete(room.channelId);
                    console.log(`🗑️ LaGuts: Boş oda silindi (${room.channelId})`);
                } catch (error) {
                    console.error('Oda silme hatası:', error);
                }
            }
        }
    }

    async handleOwnerLeft(channel) {
        const room = await this.client.db.getVoiceRoom(channel.id);
        if (!room) return;

        const members = channel.members;
        if (members.size === 0) {
            // Oda boşsa sil
            try {
                await channel.delete();
                await this.client.db.deleteVoiceRoom(channel.id);
                this.roomPanels.delete(channel.id);
            } catch (error) {
                console.error('Sahip çıkışı oda silme:', error);
            }
        } else {
            // En eski üyeyi yeni sahip yap
            const newOwner = members.first();
            await room.update({ ownerId: newOwner.id });
            
            // Yeni sahibe izin ver
            await channel.permissionOverwrites.edit(newOwner.id, {
                Connect: true,
                ManageChannels: true,
                MoveMembers: true,
                Stream: true
            });
            
            // Eski sahibin izinlerini kaldır
            await channel.permissionOverwrites.delete(room.ownerId).catch(() => {});
            
            // Bilgilendirme
            try {
                await channel.send(`👑 **LA GUTS SAHİPLİK DEĞİŞİMİ!**\n\nYeni oda sahibi: ${newOwner}\nEski sahip odadan ayrıldı.`);
            } catch (error) {
                console.error('Sahiplik değişimi mesajı:', error);
            }
            
            // Panel güncelle
            await this.updateControlPanel(channel.id);
        }
    }
}

module.exports = TempVoiceSystem;