const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oda')
        .setDescription('Oda yönetim komutları')
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Sunucudaki aktif odaları listeler'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Bir odanın bilgilerini gösterir')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Bilgilerini görmek istediğiniz ses kanalı')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temizle')
                .setDescription('Boş odaları temizler')
                .setDefaultMemberPermissions(8)), // Administrator

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'liste') {
            await this.handleList(interaction, client);
        } else if (subcommand === 'bilgi') {
            await this.handleInfo(interaction, client);
        } else if (subcommand === 'temizle') {
            await this.handleCleanup(interaction, client);
        }
    },

    async handleList(interaction, client) {
        try {
            const rooms = await client.db.getGuildRooms(interaction.guild.id);
            
            if (rooms.length === 0) {
                await interaction.reply({
                    content: '📭 Bu sunucuda aktif özel oda bulunmuyor.',
                    ephemeral: true
                });
                return;
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${interaction.guild.name} - Aktif Odalar`)
                .setColor(0x5865F2)
                .setDescription(`Toplam **${rooms.length}** aktif oda bulunuyor.`)
                .setFooter({ text: 'Son güncelleme' })
                .setTimestamp();
            
            for (const room of rooms.slice(0, 10)) { // İlk 10 odayı göster
                const channel = interaction.guild.channels.cache.get(room.channelId);
                const owner = await interaction.guild.members.fetch(room.ownerId).catch(() => null);
                
                embed.addFields({
                    name: `${room.theme} ${room.name || 'Özel Oda'}`,
                    value: `**Kanal:** ${channel || 'Silinmiş'}\n**Sahip:** ${owner || 'Bulunamadı'}\n**Limit:** ${room.userLimit === 0 ? 'Sınırsız' : room.userLimit}\n**Durum:** ${room.locked ? '🔒 Kilitli' : '🔓 Açık'}`,
                    inline: false
                });
            }
            
            if (rooms.length > 10) {
                embed.setFooter({ text: `${rooms.length - 10} oda daha var... • Son güncelleme` });
            }
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Oda listeleme hatası:', error);
            await interaction.reply({
                content: '❌ Odalar listelenirken bir hata oluştu!',
                ephemeral: true
            });
        }
    },

    async handleInfo(interaction, client) {
        const channel = interaction.options.getChannel('kanal');
        
        if (channel.type !== 2) { // 2 = GUILD_VOICE
            await interaction.reply({
                content: '❌ Lütfen bir ses kanalı seçin!',
                ephemeral: true
            });
            return;
        }
        
        const room = await client.db.getVoiceRoom(channel.id);
        
        if (!room) {
            await interaction.reply({
                content: '❌ Bu kanal bir özel oda değil!',
                ephemeral: true
            });
            return;
        }
        
        const owner = await interaction.guild.members.fetch(room.ownerId).catch(() => null);
        const members = channel.members;
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Oda Bilgileri')
            .setDescription(`**${room.name || 'Özel Oda'}**`)
            .setColor(0x5865F2)
            .addFields(
                { name: '🔗 Kanal', value: `${channel}`, inline: true },
                { name: '👤 Sahip', value: `${owner || 'Bulunamadı'}`, inline: true },
                { name: '📊 Durum', value: room.locked ? '🔒 Kilitli' : '🔓 Açık', inline: true },
                { name: '👥 Limit', value: room.userLimit === 0 ? 'Sınırsız' : room.userLimit.toString(), inline: true },
                { name: '🔊 Bitrate', value: `${Math.floor(room.bitrate / 1000)}kbps`, inline: true },
                { name: '🎨 Tema', value: room.theme, inline: true },
                { name: '🎮 Tür', value: room.roomType || 'Belirtilmemiş', inline: true },
                { name: '📈 Katılımcılar', value: members.size > 0 ? members.map(m => m.user.username).join(', ') : 'Kimse yok', inline: false },
                { name: '🕒 Oluşturulma', value: `<t:${Math.floor(new Date(room.createdAt).getTime() / 1000)}:R>`, inline: true },
                { name: '⏰ Son Aktivite', value: `<t:${Math.floor(new Date(room.lastActivity).getTime() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(owner?.displayAvatarURL() || interaction.guild.iconURL())
            .setFooter({ text: `Oda ID: ${room.channelId.slice(-6)}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },

    async handleCleanup(interaction, client) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const cleaned = await client.tempVoiceSystem.cleanupAllEmptyRooms(interaction.guild);
            
            await interaction.editReply({
                content: `✅ **${cleaned}** boş oda temizlendi!`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Oda temizleme hatası:', error);
            await interaction.editReply({
                content: '❌ Odalar temizlenirken bir hata oluştu!',
                ephemeral: true
            });
        }
    }
};