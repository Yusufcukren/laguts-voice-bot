module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Güvenlik: Rate limit kontrolü
        if (!client.securitySystem.checkRateLimit(interaction.user.id, 'interaction', 15, 60000)) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: '⏳ Çok hızlı istek gönderiyorsunuz! Lütfen biraz bekleyin.',
                    ephemeral: true
                }).catch(() => {});
            }
            return;
        }

        // Slash komutları
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.warn(`❌ Bilinmeyen komut: ${interaction.commandName}`);
                return;
            }

            try {
                // Yetki kontrolü (komut specific ise)
                if (command.data.default_member_permissions) {
                    const permissions = BigInt(command.data.default_member_permissions);
                    if (!interaction.member.permissions.has(permissions)) {
                        await interaction.reply({
                            content: '❌ Bu komutu kullanmak için yeterli yetkiniz yok!',
                            ephemeral: true
                        });
                        return;
                    }
                }

                console.log(`📝 ${interaction.user.tag} [${interaction.guild?.name || 'DM'}] => /${interaction.commandName}`);
                
                await command.execute(interaction, client);
                
            } catch (error) {
                console.error(`❌ Komut hatası [${interaction.commandName}]:`, error);
                
                const errorMessage = '❌ Komut çalıştırılırken bir hata oluştu!';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        content: errorMessage, 
                        ephemeral: true 
                    }).catch(() => {});
                } else {
                    await interaction.reply({ 
                        content: errorMessage, 
                        ephemeral: true 
                    }).catch(() => {});
                }

                // Hata logu (opsiyonel)
                try {
                    const errorChannel = interaction.guild?.channels.cache.find(ch => 
                        ch.name.includes('log') || ch.name.includes('hata')
                    );
                    
                    if (errorChannel) {
                        const embed = {
                            color: 0xFF0000,
                            title: '❌ Komut Hatası',
                            description: `**Komut:** \`/${interaction.commandName}\`\n**Kullanıcı:** ${interaction.user.tag}\n**Sunucu:** ${interaction.guild?.name || 'DM'}`,
                            fields: [
                                { name: 'Hata', value: `\`\`\`${error.message.slice(0, 1000)}\`\`\`` }
                            ],
                            timestamp: new Date()
                        };
                        
                        await errorChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                } catch (logError) {
                    console.error('Hata loglama hatası:', logError);
                }
            }
            return;
        }

        // Buton etkileşimleri
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            try {
                // Oda oluşturma butonu
                if (customId === 'create_voice_room') {
                    if (!client.securitySystem.checkVoiceFlood(interaction.user.id, 'create_room')) {
                        await interaction.reply({
                            content: '⏳ Lütfen biraz bekleyin!',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    await client.tempVoiceSystem.createVoiceRoom(interaction);
                    return;
                }
                
                // Oda kontrol butonları
                if (customId.startsWith('voice_')) {
                    await client.tempVoiceSystem.handleButtonInteraction(interaction);
                    return;
                }
                
                // Setup butonları
                if (customId.startsWith('setup_') || customId.startsWith('remove_')) {
                    // Bu butonlar setup.js içinde handle ediliyor
                    return;
                }
                
                // Yardım butonu
                if (customId === 'voice_help') {
                    await interaction.reply({
                        content: '**🎧 Yardım Menüsü**\n\n• **Oda Oluştur:** Butona basın\n• **İsim Değiştir:** ✏️ butonu\n• **Limit Ayarla:** 👥 butonu\n• **Kilitle/Aç:** 🔒 butonu\n• **Tema Seç:** 🎨 menü\n• **Oda Türü:** 🎮 menü\n• **Devret:** 👑 butonu\n• **Çıkar:** 🚪 butonu',
                        ephemeral: true
                    });
                    return;
                }
                
            } catch (error) {
                console.error('Buton işleme hatası:', error);
                await interaction.reply({
                    content: '❌ İşlem sırasında bir hata oluştu!',
                    ephemeral: true
                }).catch(() => {});
            }
            return;
        }

        // Select Menu etkileşimleri
        if (interaction.isStringSelectMenu()) {
            const customId = interaction.customId;
            
            try {
                // Oda türü seçimi
                if (customId.startsWith('room_type_')) {
                    await client.tempVoiceSystem.handleSelectMenu(interaction);
                    return;
                }
                
                // Tema seçimi
                if (customId.startsWith('room_theme_')) {
                    await client.tempVoiceSystem.handleSelectMenu(interaction);
                    return;
                }
                
                // Setup seçimi
                if (customId.startsWith('setup_action_')) {
                    // Bu selectler setup.js içinde handle ediliyor
                    return;
                }
                
                // Transfer seçimi
                if (customId.startsWith('transfer_select_')) {
                    // TempVoiceSystem'de handle ediliyor
                    return;
                }
                
                // Kick seçimi
                if (customId.startsWith('kick_select_')) {
                    // TempVoiceSystem'de handle ediliyor
                    return;
                }
                
            } catch (error) {
                console.error('Select menu işleme hatası:', error);
                await interaction.reply({
                    content: '❌ İşlem sırasında bir hata oluştu!',
                    ephemeral: true
                }).catch(() => {});
            }
            return;
        }

        // Modal etkileşimleri
        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;
            
            try {
                // Setup modal'ı
                if (customId.startsWith('setup_modal_')) {
                    // setup.js içinde handle ediliyor
                    return;
                }
                
                // Settings modal'ı
                if (customId.startsWith('settings_modal_')) {
                    // setup.js içinde handle ediliyor
                    return;
                }
                
                // Oda isim/limit modal'ları
                if (customId.startsWith('rename_modal_') || customId.startsWith('limit_modal_')) {
                    // TempVoiceSystem'de handle ediliyor
                    return;
                }
                
            } catch (error) {
                console.error('Modal işleme hatası:', error);
                await interaction.reply({
                    content: '❌ İşlem sırasında bir hata oluştu!',
                    ephemeral: true
                }).catch(() => {});
            }
            return;
        }

        // Context Menu etkileşimleri (opsiyonel)
        if (interaction.isContextMenuCommand()) {
            // Context menu komutları burada handle edilebilir
            return;
        }

        // Autocomplete etkileşimleri
        if (interaction.isAutocomplete()) {
            // Autocomplete handle edilebilir
            return;
        }
    }
};