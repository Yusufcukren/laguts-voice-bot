const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'setup',
    description: '🎚️ LaGuts özel ses odası sistemini kurar',
    default_member_permissions: '8'
  },
  {
    name: 'premium',
    description: '🎚️ LaGuts premium sistemini yönet',
    options: [
      {
        type: 1,
        name: 'bilgi',
        description: 'LaGuts premium özelliklerini göster'
      },
      {
        type: 1,
        name: 'durum',
        description: 'Premium durumunu kontrol et'
      },
      {
        type: 1,
        name: 'aktiflestir',
        description: 'Premium aktifleştir (Sadece sahip)',
        options: [
          {
            type: 3,
            name: 'sunucu_id',
            description: 'Sunucu ID',
            required: true
          },
          {
            type: 4,
            name: 'gun',
            description: 'Kaç gün aktifleştirilecek',
            required: true,
            min_value: 1,
            max_value: 365
          }
        ]
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔧 LaGuts komutları kaydediliyor...');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    
    console.log('✅ LaGuts komutları başarıyla kaydedildi!');
  } catch (error) {
    console.error('❌ Hata:', error);
  }
})();