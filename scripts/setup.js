const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
╔══════════════════════════════════════╗
║        🎚️ LA GUTS KURULUMU         ║
╚══════════════════════════════════════╝
`);

const questions = [
  {
    question: 'Discord Bot Token: ',
    envKey: 'DISCORD_TOKEN'
  },
  {
    question: 'Client ID: ',
    envKey: 'CLIENT_ID'
  },
  {
    question: 'Client Secret: ',
    envKey: 'CLIENT_SECRET'
  },
  {
    question: 'Bot Owner ID (Discord ID\'niz): ',
    envKey: 'OWNER_ID'
  }
];

let answers = {};
let currentQuestion = 0;

function askQuestion() {
  if (currentQuestion >= questions.length) {
    createEnvFile();
    return;
  }
  
  const q = questions[currentQuestion];
  rl.question(q.question, (answer) => {
    answers[q.envKey] = answer.trim();
    currentQuestion++;
    askQuestion();
  });
}

function createEnvFile() {
  const envContent = `# 🎚️ LaGuts Bot Configuration
DISCORD_TOKEN=${answers.DISCORD_TOKEN}
CLIENT_ID=${answers.CLIENT_ID}
CLIENT_SECRET=${answers.CLIENT_SECRET}
OWNER_ID=${answers.OWNER_ID}

# 🌐 Dashboard Configuration
REDIRECT_URI=http://localhost:3000/auth/discord/callback
SESSION_SECRET=${require('crypto').randomBytes(32).toString('hex')}
ENABLE_DASHBOARD=true
PORT=3000

# 🗄️ Database
DATABASE_URL=sqlite:///database.sqlite

# ⚙️ Bot Settings
BOT_PREFIX=!
BOT_STATUS=online
BOT_ACTIVITY_TYPE=2
BOT_ACTIVITY_NAME=LaGuts Özel Odalar
BOT_COOLDOWN=30
BOT_DEFAULT_COLOR=0x8B0000

# 📊 Performance
MAX_ROOMS_PER_GUILD=10
MAX_BITRATE=96000
MAX_USER_LIMIT=99

# 🎨 Theme Settings
THEME_COLORS={"red":"#8B0000","purple":"#8A2BE2","blue":"#1E90FF"}
THEME_EMOJIS={"red":"🔴","purple":"💜","blue":"💙"}`;

  const envPath = path.join(__dirname, '..', '.env');
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log(`
✅ .env dosyası oluşturuldu!

📁 Neler yapmalısınız:
1. Discord Developer Portal'a gidin:
   🔗 https://discord.com/developers/applications

2. Bot'unuzu seçin ve:
   • "Bot" sekmesinde "Reset Token" yapın
   • "Privileged Gateway Intents" hepsini açın:
     ✓ PRESENCE INTENT
     ✓ SERVER MEMBERS INTENT  
     ✓ MESSAGE CONTENT INTENT

3. Bot'u sunucunuza ekleyin:
   🔗 https://discord.com/api/oauth2/authorize?client_id=${answers.CLIENT_ID}&permissions=8&scope=bot%20applications.commands

4. Bot'u başlatın:
   📦 npm install
   🚀 npm run dev

5. Sunucunuzda komutu kullanın:
   💻 /setup
  `);
  
  rl.close();
}

// Mevcut .env kontrolü
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  rl.question('.env dosyası zaten var. Yeniden oluşturmak istiyor musunuz? (e/h): ', (answer) => {
    if (answer.toLowerCase() === 'e') {
      askQuestion();
    } else {
      console.log('İptal edildi.');
      rl.close();
    }
  });
} else {
  askQuestion();
}