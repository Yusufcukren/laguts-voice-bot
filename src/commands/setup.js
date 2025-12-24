const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { createSetupEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Özel ses odası sistemini kurar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        
        // Premium Ayarlar
        .addStringOption(option =>
            option.setName('kategori_adı')
                .setDescription('Kategori adını özelleştir (Varsayılan: 🔊 Özel Odalar)')
                .setRequired(false)
                .setMaxLength(32))
        
        .addStringOption(option =>
            option.setName('kanal_adı')
                .setDescription('Oluşturma kanalı adı (Varsayılan: 🎧-oda-olustur)')
                .setRequired(false)
                .setMaxLength(32))
        
        .addIntegerOption(option =>
            option.setName('varsayılan_limit')
                .setDescription('Varsayılan oda limiti (0 = sınırsız)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(99))
        
        .addIntegerOption(option =>
            option.setName('varsayılan_bitrate')
                .setDescription('Varsayılan bitrate (kbps)')
                .setRequired(false)
                .setMinValue(8)
                .setMaxValue(384))
        
        .addIntegerOption(option =>
            option.setName('maksimum_oda')
                .setDescription('Sunucu başına maksimum oda sayısı')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50))
        
        .addStringOption(option =>
            option.setName('varsayılan_tema')
                .setDescription('Varsayılan oda teması')
                .setRequired(false)
                .addChoices(
                    { name: '🔥 Kırmızı', value: '🔥' },
                    { name: '💜 Mor', value: '💜' },
                    { name: '💙 Mavi', value: '💙' }
                ))
        
        .addBooleanOption(option =>
            option.setName('afk_sistemi')
                .setDescription('AFK sistemi aktif olsun mu?')
                .setRequired(false))
        
        .addIntegerOption(option =>
            option.setName('afk_süresi')
                .setDescription('AFK süresi (dakika)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(60))
        
        .addStringOption(option =>
            option.setName('afk_aksiyon')
                .setDescription('AFK olanlara ne yapılsın?')
                .setRequired(false)
                .addChoices(
                    { name: 'Hiçbir şey yapma', value: 'none' },
                    { name: 'Sadece uyar', value: 'warn' },
                    { name: 'Odadan at', value: 'kick' }
                )),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const member = interaction.member;
            
            // Yetki kontrolü
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.editReply({
                    content: '❌ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!',
                    ephemeral: true
                });
            }

            // Bot yetkilerini kontrol et
            const botMember = await guild.members.fetch(client.user.id);
            const requiredPermissions = [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages
            ];
            
            const missingPermissions = requiredPermissions.filter(
                perm => !botMember.permissions.has(perm)
            );
            
            if (missingPermissions.length > 0) {
                const missingList = missingPermissions.map(perm => `\`${perm}\``).join(', ');
                return await interaction.editReply({
                    content: `❌ Botun şu yetkilere ihtiyacı var: ${missingList}`,
                    ephemeral: true
                });
            }

            // Mevcut kurulum kontrolü
            const existingGuild = await client.db.getGuild(guild.id);
            if (existingGuild.categoryId && existingGuild.channelId) {
                return await this.showExistingSetup(interaction, client, existingGuild);
            }

            // Modal ile kurulum
            await this.showSetupModal(interaction, client);

        } catch (error) {
            console.error('Setup komut hatası:', error);
            await interaction.editReply({
                content: '❌ Kurulum sırasında bir hata oluştu!',
                ephemeral: true
            });
        }
    },

    async showExistingSetup(interaction, client, existingGuild) {
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
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
            .setFooter({ text: '30 saniye içinde seçim yapın' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`setup_action_${interaction.id}`)
            .setPlaceholder('Bir işlem seçin')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Yeniden Kur')
                    .setDescription('Eski kanalları silip yeniden kurar')
                    .setValue('recreate'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚡ Güncelle')
                    .setDescription('Mevcut kanalları günceller')
                    .setValue('update'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ Ayarları Değiştir')
                    .setDescription('Sadece ayarları günceller')
                    .setValue('settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🗑️ Kaldır')
                    .setDescription('Tüm sistemi kaldırır')
                    .setValue('remove')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        // Seçim bekleyici
        const filter = i => i.customId === `setup_action_${interaction.id}` && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            try {
                await i.deferUpdate();
                
                switch (i.values[0]) {
                    case 'recreate':
                        await this.performSetup(interaction, client, true);
                        break;
                    case 'update':
                        await this.updateExistingSetup(interaction, client, existingGuild);
                        break;
                    case 'settings':
                        await this.showSettingsModal(interaction, client, existingGuild);
                        break;
                    case 'remove':
                        await this.removeSetup(interaction, client, existingGuild);
                        break;
                }
                
                collector.stop();
            } catch (error) {
                console.error('Setup action error:', error);
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                await interaction.editReply({
                    content: '⏳ Zaman aşımı! İşlem iptal edildi.',
                    components: []
                });
            }
        });
    },

    async showSetupModal(interaction, client) {
        const modal = new ModalBuilder()
            .setCustomId(`setup_modal_${interaction.id}`)
            .setTitle('🎧 Özel Oda Sistemi Kurulumu');

        // Kategori Adı
        const categoryInput = new TextInputBuilder()
            .setCustomId('category_name')
            .setLabel('Kategori Adı')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: 🔊 Özel Odalar')
            .setValue('🔊 Özel Odalar')
            .setMaxLength(32)
            .setRequired(true);

        // Kanal Adı
        const channelInput = new TextInputBuilder()
            .setCustomId('channel_name')
            .setLabel('Oluşturma Kanalı Adı')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: 🎧-oda-olustur')
            .setValue('🎧-oda-olustur')
            .setMaxLength(32)
            .setRequired(true);

        // Varsayılan Limit
        const limitInput = new TextInputBuilder()
            .setCustomId('default_limit')
            .setLabel('Varsayılan Oda Limiti (0 = sınırsız)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: 10')
            .setValue('10')
            .setMaxLength(2)
            .setRequired(true);

        // Varsayılan Bitrate
        const bitrateInput = new TextInputBuilder()
            .setCustomId('default_bitrate')
            .setLabel('Varsayılan Bitrate (kbps)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: 64 (64kbps)')
            .setValue('64')
            .setMaxLength(3)
            .setRequired(true);

        // Maksimum Oda
        const maxRoomsInput = new TextInputBuilder()
            .setCustomId('max_rooms')
            .setLabel('Maksimum Oda Sayısı')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: 5')
            .setValue('5')
            .setMaxLength(2)
            .setRequired(true);

        // Modal'a ekle
        modal.addComponents(
            new ActionRowBuilder().addComponents(categoryInput),
            new ActionRowBuilder().addComponents(channelInput),
            new ActionRowBuilder().addComponents(limitInput),
            new ActionRowBuilder().addComponents(bitrateInput),
            new ActionRowBuilder().addComponents(maxRoomsInput)
        );

        await interaction.showModal(modal);

        // Modal submit bekleyici
        const filter = i => i.customId === `setup_modal_${interaction.id}` && i.user.id === interaction.user.id;
        
        try {
            const submitted = await interaction.awaitModalSubmit({ filter, time: 120000 });
            
            const categoryName = submitted.fields.getTextInputValue('category_name');
            const channelName = submitted.fields.getTextInputValue('channel_name');
            const defaultLimit = parseInt(submitted.fields.getTextInputValue('default_limit'));
            const defaultBitrate = parseInt(submitted.fields.getTextInputValue('default_bitrate')) * 1000;
            const maxRooms = parseInt(submitted.fields.getTextInputValue('max_rooms'));
            
            await submitted.deferReply({ ephemeral: true });
            
            await this.performSetup(submitted, client, false, {
                categoryName,
                channelName,
                defaultLimit,
                defaultBitrate,
                maxRooms
            });
            
        } catch (error) {
            // Modal zaman aşımı
            console.log('Setup modal timeout');
        }
    },

    async performSetup(interaction, client, recreate = false, options = {}) {
        try {
            const guild = interaction.guild;
            
            const categoryName = options.categoryName || '🔊 Özel Odalar';
            const channelName = options.channelName || '🎧-oda-olustur';
            const defaultLimit = options.defaultLimit || 10;
            const defaultBitrate = options.defaultBitrate || 64000;
            const maxRooms = options.maxRooms || 5;
            
            // Eski kanalları temizle (recreate ise)
            if (recreate) {
                const existingGuild = await client.db.getGuild(guild.id);
                if (existingGuild.categoryId) {
                    try {
                        const oldCategory = guild.channels.cache.get(existingGuild.categoryId);
                        const oldChannel = guild.channels.cache.get(existingGuild.channelId);
                        
                        if (oldChannel && oldChannel.deletable) {
                            await oldChannel.delete().catch(() => {});
                        }
                        if (oldCategory && oldCategory.deletable) {
                            await oldCategory.delete().catch(() => {});
                        }
                    } catch (error) {
                        console.error('Eski kanalları silme hatası:', error);
                    }
                }
            }

            // Premium özellik: Kategori konumu
            const channels = await guild.channels.fetch();
            const textChannels = channels.filter(c => c.type === ChannelType.GuildText);
            const targetPosition = textChannels.size > 0 ? textChannels.first().position : 0;

            // Kategori oluştur (Premium stil)
            const category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                position: targetPosition,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.Connect]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.Administrator]
                    }
                ],
                reason: `Özel ses odası sistemi kurulumu - ${interaction.user.tag}`
            });

            // Metin kanalı oluştur (Premium stil)
            const textChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: '🎧 Özel ses odası oluşturmak için butona basın!',
                position: 0,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ReadMessageHistory
                        ],
                        deny: [
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.AddReactions,
                            PermissionFlagsBits.CreatePublicThreads,
                            PermissionFlagsBits.CreatePrivateThreads,
                            PermissionFlagsBits.SendMessagesInThreads
                        ]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.Administrator]
                    }
                ],
                reason: `Oluşturma kanalı - ${interaction.user.tag}`
            });

            // Premium Embed
            const embed = new EmbedBuilder()
                .setTitle('🎧 **PREMIUM** Özel Ses Odası Sistemi')
                .setDescription(`**${guild.name}** sunucusuna hoş geldiniz!`)
                .setColor(0x5865F2)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '🚀 **Başlamak Çok Kolay**',
                        value: '**1️⃣** Aşağıdaki butona tıkla\n**2️⃣** Ses kanalın otomatik oluşturulsun\n**3️⃣** Panelle odanı özelleştir\n**4️⃣** Arkadaşlarını davet et!',
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
                .setImage('https://cdn.discordapp.com/attachments/1064020579860156416/1064020580254417037/voice_banner.png')
                .setFooter({ 
                    text: `Kurulum: ${interaction.user.tag} • ${new Date().getFullYear()}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            // Premium Butonlar
            const createButton = new ButtonBuilder()
                .setCustomId('create_voice_room')
                .setLabel('🎧 Odanı Oluştur')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎧');

            const helpButton = new ButtonBuilder()
                .setCustomId('voice_help')
                .setLabel('❓ Yardım')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❓');

            const panelButton = new ButtonBuilder()
                .setLabel('🌐 Kontrol Paneli')
                .setStyle(ButtonStyle.Link)
                .setURL(process.env.WEBSITE_URL || 'http://localhost:3000')
                .setEmoji('🌐');

            const row = new ActionRowBuilder()
                .addComponents(createButton, helpButton, panelButton);

            // Kanalı gönder
            await textChannel.send({
                content: `## 🎉 **Özel Ses Odası Sistemi Aktif!**\n<@&${guild.id}>`, // @everyone
                embeds: [embed],
                components: [row]
            });

            // Veritabanını güncelle
            await client.db.updateGuild(guild.id, {
                categoryId: category.id,
                channelId: textChannel.id,
                defaultBitrate: defaultBitrate,
                defaultUserLimit: defaultLimit,
                maxRooms: maxRooms,
                defaultTheme: '💙',
                afkEnabled: false,
                afkTime: 5,
                afkAction: 'none'
            });

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
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
                        value: `${textChannel}\n\`${textChannel.id}\``, 
                        inline: true 
                    },
                    { 
                        name: '⚙️ **Varsayılan Ayarlar**', 
                        value: `**Limit:** ${defaultLimit === 0 ? 'Sınırsız' : defaultLimit}\n**Bitrate:** ${Math.floor(defaultBitrate / 1000)}kbps\n**Max Oda:** ${maxRooms}`, 
                        inline: false 
                    }
                )
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setFooter({ 
                    text: `Kurulum ID: ${interaction.id.slice(-8)}`, 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setTimestamp();

            // Log kanalına mesaj gönder
            const auditLogChannel = guild.channels.cache.find(ch => 
                ch.name.includes('log') || 
                ch.name.includes('kayıt') ||
                (ch.type === ChannelType.GuildText && 
                 ch.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages))
            );

            if (auditLogChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📊 **Sistem Kurulumu Logu**')
                    .setDescription(`**${interaction.user}** tarafından özel ses odası sistemi kuruldu.`)
                    .addFields(
                        { name: '👤 Kurulum Yapan', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                        { name: '📁 Kategori', value: `${category.name}`, inline: true },
                        { name: '📝 Kanal', value: `${textChannel.name}`, inline: true },
                        { name: '⚙️ Ayarlar', value: `Limit: ${defaultLimit} | Bitrate: ${Math.floor(defaultBitrate / 1000)}kbps`, inline: false },
                        { name: '🕒 Zaman', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'Özel Ses Odası Sistemi' })
                    .setTimestamp();
                
                await auditLogChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

            // Özel mesaj gönder (opsiyonel)
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('🎉 Kurulum Başarılı!')
                    .setDescription(`**${guild.name}** sunucusunda özel ses odası sistemi kuruldu.`)
                    .addFields(
                        { name: '🔗 Kanal', value: `[Oluşturma Kanalına Git](${textChannel.url})`, inline: true },
                        { name: '⚙️ Ayarlar', value: `[Dashboard'u Aç](${process.env.WEBSITE_URL || 'http://localhost:3000'})`, inline: true }
                    )
                    .setFooter({ text: 'Sorularınız için /yardım komutunu kullanın' });
                
                await interaction.user.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (error) {
                // DM gönderilemezse sorun değil
            }

        } catch (error) {
            console.error('Setup perform error:', error);
            throw error;
        }
    },

    async updateExistingSetup(interaction, client, existingGuild) {
        try {
            const guild = interaction.guild;
            
            // Kategori ve kanalı kontrol et
            const category = guild.channels.cache.get(existingGuild.categoryId);
            const textChannel = guild.channels.cache.get(existingGuild.channelId);
            
            if (!category || !textChannel) {
                await interaction.editReply({
                    content: '❌ Mevcut kanallar bulunamadı! Yeniden kurulum yapılacak.',
                    components: []
                });
                
                await this.performSetup(interaction, client, true);
                return;
            }

            // Embed'i güncelle
            const messages = await textChannel.messages.fetch({ limit: 10 });
            const setupMessage = messages.find(m => 
                m.embeds.length > 0 && 
                m.embeds[0].title?.includes('Özel Ses Odası')
            );

            if (setupMessage) {
                const embed = new EmbedBuilder()
                    .setTitle('🎧 **GÜNCELLENMİŞ** Özel Ses Odası Sistemi')
                    .setDescription(`**${guild.name}** sunucusuna hoş geldiniz!\n\n*Sistem ${new Date().toLocaleDateString('tr-TR')} tarihinde güncellendi*`)
                    .setColor(0x5865F2)
                    .addFields(
                        {
                            name: '🚀 **Nasıl Kullanılır?**',
                            value: '1. **Butona tıkla** → Ses kanalın oluşturulsun\n2. **Kanala gir** → Oda sahibi ol\n3. **Paneli kullan** → İsmini, limitini, temasını ayarla\n4. **Keyfini çıkar** → Arkadaşlarını davet et!',
                            inline: false
                        }
                    )
                    .setFooter({ 
                        text: `Son güncelleme: ${interaction.user.tag}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                    .setTimestamp();

                await setupMessage.edit({ embeds: [embed] });
            }

            await interaction.editReply({
                content: '✅ Mevcut kurulum başarıyla güncellendi!',
                components: []
            });

        } catch (error) {
            console.error('Update setup error:', error);
            await interaction.editReply({
                content: '❌ Güncelleme sırasında hata oluştu!',
                components: []
            });
        }
    },

    async removeSetup(interaction, client, existingGuild) {
        try {
            const guild = interaction.guild;
            
            // Onay embed'i
            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ **SİSTEM KALDIRMA**')
                .setDescription('Bu işlem geri alınamaz! Tüm özel ses odası sistemi kaldırılacak.')
                .addFields(
                    { name: '❌ Silinecekler', value: '• Kategori\n• Oluşturma kanalı\n• Tüm özel odalar\n• Tüm ayarlar\n• Veritabanı kayıtları', inline: false },
                    { name: '📊 İstatistikler', value: 'Bu sunucudaki tüm odalar silinecek ve ayarlar sıfırlanacak.', inline: false }
                )
                .setFooter({ text: 'Onaylamak için butona basın' });

            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`remove_confirm_${interaction.id}`)
                        .setLabel('✅ EVET, KALDIR')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`remove_cancel_${interaction.id}`)
                        .setLabel('❌ İPTAL')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                embeds: [confirmEmbed],
                components: [confirmRow]
            });

            // Onay bekleyici
            const filter = i => i.customId.startsWith('remove_') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
                
                if (i.customId === `remove_confirm_${interaction.id}`) {
                    // Tüm odaları sil
                    const rooms = await client.db.getGuildRooms(guild.id);
                    
                    for (const room of rooms) {
                        try {
                            const channel = guild.channels.cache.get(room.channelId);
                            if (channel && channel.deletable) {
                                await channel.delete();
                            }
                        } catch (error) {
                            console.error('Oda silme hatası:', error);
                        }
                        await client.db.deleteVoiceRoom(room.channelId);
                    }

                    // Kategori ve kanalı sil
                    try {
                        const category = guild.channels.cache.get(existingGuild.categoryId);
                        const textChannel = guild.channels.cache.get(existingGuild.channelId);
                        
                        if (textChannel && textChannel.deletable) await textChannel.delete();
                        if (category && category.deletable) await category.delete();
                    } catch (error) {
                        console.error('Kanal silme hatası:', error);
                    }

                    // Veritabanını sıfırla
                    await client.db.updateGuild(guild.id, {
                        categoryId: null,
                        channelId: null
                    });

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✅ **Sistem Başarıyla Kaldırıldı**')
                        .setDescription('Tüm özel ses odası sistemi kaldırıldı.')
                        .addFields(
                            { name: '🗑️ Silinenler', value: `• ${rooms.length} oda\n• Kategori\n• Oluşturma kanalı`, inline: false },
                            { name: '📝 Not', value: 'Yeniden kurmak için `/setup` komutunu kullanabilirsiniz.', inline: false }
                        );

                    await interaction.editReply({
                        embeds: [successEmbed],
                        components: []
                    });

                } else {
                    await interaction.editReply({
                        content: '✅ İşlem iptal edildi.',
                        components: []
                    });
                }
                
                collector.stop();
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await interaction.editReply({
                        content: '⏳ Zaman aşımı! İşlem iptal edildi.',
                        components: []
                    });
                }
            });

        } catch (error) {
            console.error('Remove setup error:', error);
            await interaction.editReply({
                content: '❌ Kaldırma sırasında hata oluştu!',
                components: []
            });
        }
    },

    async showSettingsModal(interaction, client, existingGuild) {
        const modal = new ModalBuilder()
            .setCustomId(`settings_modal_${interaction.id}`)
            .setTitle('⚙️ Sistem Ayarları');

        // Bitrate
        const bitrateInput = new TextInputBuilder()
            .setCustomId('bitrate')
            .setLabel('Varsayılan Bitrate (kbps)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('8-384 arası')
            .setValue(Math.floor(existingGuild.defaultBitrate / 1000).toString())
            .setRequired(true);

        // Limit
        const limitInput = new TextInputBuilder()
            .setCustomId('limit')
            .setLabel('Varsayılan Oda Limiti (0 = sınırsız)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0-99 arası')
            .setValue(existingGuild.defaultUserLimit.toString())
            .setRequired(true);

        // Max Odalar
        const maxRoomsInput = new TextInputBuilder()
            .setCustomId('max_rooms')
            .setLabel('Maksimum Oda Sayısı')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1-50 arası')
            .setValue(existingGuild.maxRooms?.toString() || '5')
            .setRequired(true);

        // AFK Süresi
        const afkTimeInput = new TextInputBuilder()
            .setCustomId('afk_time')
            .setLabel('AFK Süresi (dakika)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1-60 arası')
            .setValue(existingGuild.afkTime?.toString() || '5')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(bitrateInput),
            new ActionRowBuilder().addComponents(limitInput),
            new ActionRowBuilder().addComponents(maxRoomsInput),
            new ActionRowBuilder().addComponents(afkTimeInput)
        );

        await interaction.showModal(modal);

        const filter = i => i.customId === `settings_modal_${interaction.id}` && i.user.id === interaction.user.id;
        
        try {
            const submitted = await interaction.awaitModalSubmit({ filter, time: 120000 });
            
            const bitrate = parseInt(submitted.fields.getTextInputValue('bitrate')) * 1000;
            const limit = parseInt(submitted.fields.getTextInputValue('limit'));
            const maxRooms = parseInt(submitted.fields.getTextInputValue('max_rooms'));
            const afkTime = parseInt(submitted.fields.getTextInputValue('afk_time'));
            
            // Validasyon
            const validatedBitrate = Math.min(Math.max(bitrate, 8000), 384000);
            const validatedLimit = Math.min(Math.max(limit, 0), 99);
            const validatedMaxRooms = Math.min(Math.max(maxRooms, 1), 50);
            const validatedAfkTime = Math.min(Math.max(afkTime, 1), 60);
            
            await submitted.deferReply({ ephemeral: true });
            
            // Veritabanını güncelle
            await client.db.updateGuild(interaction.guild.id, {
                defaultBitrate: validatedBitrate,
                defaultUserLimit: validatedLimit,
                maxRooms: validatedMaxRooms,
                afkTime: validatedAfkTime
            });
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Ayarlar Güncellendi!')
                .setDescription('Sistem ayarları başarıyla güncellendi.')
                .addFields(
                    { name: '🔊 Bitrate', value: `${Math.floor(validatedBitrate / 1000)}kbps`, inline: true },
                    { name: '👥 Limit', value: validatedLimit === 0 ? 'Sınırsız' : validatedLimit.toString(), inline: true },
                    { name: '📊 Max Oda', value: validatedMaxRooms.toString(), inline: true },
                    { name: '⏳ AFK Süresi', value: `${validatedAfkTime} dakika`, inline: true }
                );
            
            await submitted.editReply({
                embeds: [successEmbed],
                components: []
            });
            
        } catch (error) {
            console.log('Settings modal timeout');
        }
    }
};