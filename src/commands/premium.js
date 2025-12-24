const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('🎚️ LaGuts premium sistemini yönet')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('LaGuts premium özelliklerini göster')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('durum')
                .setDescription('Premium durumunu kontrol et')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('aktiflestir')
                .setDescription('Sadece bot sahibi: Premium aktifleştir')
                .addStringOption(option =>
                    option
                        .setName('sunucu_id')
                        .setDescription('Premium verilecek sunucu ID')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('gun')
                        .setDescription('Premium süresi (gün)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(365)
                )
        )
        .setDMPermission(false),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'bilgi') {
            await showPremiumInfo(interaction, client);
        } else if (subcommand === 'durum') {
            await showPremiumStatus(interaction, client);
        } else if (subcommand === 'aktiflestir') {
            await activatePremium(interaction, client);
        }
    }
};

async function showPremiumInfo(interaction, client) {
    const embed = new EmbedBuilder()
        .setTitle('🎚️ LA GUTS PREMIUM')
        .setDescription('**Premium kalitede özel ses deneyimi!**\nAşağıdaki premium özelliklerden yararlanın.')
        .setColor(client.brand.color)
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            {
                name: '⚡ PREMIUM ÖZELLİKLER',
                value: '```• Sınırsız özel oda oluşturma\n• Özel LaGuts temaları (Kırmızı/Mor)\n• Yüksek bitrate (128kbps)\n• Web dashboard erişimi\n• Preset kaydetme sistemi\n• Öncelikli destek\n• AFK sistem özelleştirme```'
            },
            {
                name: '💰 FİYATLANDIRMA',
                value: '**Aylık:** $4.99\n**3 Aylık:** $12.99 (%13 indirim)\n**Yıllık:** $39.99 (%33 indirim)'
            },
            {
                name: '🚀 NASIL ALINIR?',
                value: '1. Bot sahibi ile iletişime geçin\n2. Ödeme yapın\n3. `/premium aktiflestir` komutunu kullanın\n4. Premium hemen aktif olur!'
            }
        )
        .setFooter({ 
            text: '🎚️ LaGuts Premium | En kaliteli ses deneyimi',
            iconURL: client.user.displayAvatarURL()
        });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('📞 İletişim')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/laguts'),
            new ButtonBuilder()
                .setLabel('🌐 Website')
                .setStyle(ButtonStyle.Link)
                .setURL('https://laguts.com'),
            new ButtonBuilder()
                .setCustomId('premium_check')
                .setLabel('Durumumu Kontrol Et')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false
    });
}

async function showPremiumStatus(interaction, client) {
    const isPremium = await client.db.isPremium(interaction.guild.id);
    const guildData = await client.db.getGuild(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🎚️ PREMIUM DURUMU')
        .setColor(isPremium ? 0x00FF00 : 0xFF0000)
        .setDescription(isPremium ? '**✅ PREMIUM AKTİF!**' : '**❌ PREMIUM AKTİF DEĞİL**')
        .addFields(
            {
                name: '📊 SUNUCU BİLGİLERİ',
                value: `**Sunucu:** ${interaction.guild.name}\n**ID:** ${interaction.guild.id}\n**Üye:** ${interaction.guild.memberCount}`,
                inline: true
            },
            {
                name: '⚡ PREMIUM DETAY',
                value: isPremium ? 
                    `**Süre:** ${guildData.premiumExpires ? `<t:${Math.floor(new Date(guildData.premiumExpires).getTime() / 1000)}:R>` : 'Süresiz'}\n**Oda Limiti:** Sınırsız` :
                    `**Oda Limiti:** 1\n**Bitrate:** 64kbps\n**Tema:** Standart`,
                inline: true
            }
        )
        .setFooter({ 
            text: isPremium ? '🎚️ Premium keyfini çıkarın!' : '⚡ Premium almak için /premium bilgi',
            iconURL: client.user.displayAvatarURL()
        });

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

async function activatePremium(interaction, client) {
    // Sadece bot sahibi kullanabilir
    if (interaction.user.id !== process.env.OWNER_ID) {
        return await interaction.reply({
            content: '❌ Bu komutu sadece bot sahibi kullanabilir!',
            ephemeral: true
        });
    }

    const guildId = interaction.options.getString('sunucu_id');
    const days = interaction.options.getInteger('gun');
    
    try {
        await client.db.activatePremium(guildId, days);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ PREMIUM AKTİFLEŞTİRİLDİ!')
            .setColor(0x00FF00)
            .setDescription(`**Sunucu ID:** ${guildId}\n**Süre:** ${days} gün\n**Aktifleştiren:** ${interaction.user.tag}`)
            .addFields(
                {
                    name: '🎁 VERİLEN ÖZELLİKLER',
                    value: '• Sınırsız oda\n• Premium temalar\n• Yüksek bitrate\n• Dashboard erişimi\n• Preset sistemi'
                },
                {
                    name: '📅 BİTİŞ TARİHİ',
                    value: `<t:${Math.floor(Date.now() / 1000) + (days * 86400)}:F>`
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

        // Sunucuya bildirim gönder
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const systemChannel = guild.systemChannel || guild.channels.cache.find(ch => ch.name.includes('genel'));
            if (systemChannel) {
                const notifyEmbed = new EmbedBuilder()
                    .setTitle('🎉 LA GUTS PREMIUM AKTİF!')
                    .setDescription(`**${guild.name}** sunucusu için premium aktifleştirildi!\n\nArtık tüm premium özelliklere erişebilirsiniz!`)
                    .setColor(client.brand.color)
                    .addFields(
                        { name: '📊 Özellikler', value: 'Sınırsız oda • Premium temalar • Yüksek kalite' },
                        { name: '⏱️ Süre', value: `${days} gün` },
                        { name: '🚀 Başlangıç', value: `/setup komutunu kullanarak premium özellikleri aktifleştirin!` }
                    )
                    .setTimestamp();

                await systemChannel.send({ embeds: [notifyEmbed] });
            }
        }

    } catch (error) {
        console.error('Premium aktivasyon hatası:', error);
        await interaction.reply({
            content: '❌ Premium aktifleştirilirken hata oluştu!',
            ephemeral: true
        });
    }
}