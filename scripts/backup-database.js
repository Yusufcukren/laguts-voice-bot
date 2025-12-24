const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const moment = require('moment');

console.log('🔄 LaGuts veritabanı yedekleniyor...');

const backupDir = path.join(__dirname, '..', 'backups');
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
const backupPath = path.join(backupDir, `laguts_backup_${timestamp}.sqlite`);

// Backup klasörünü oluştur
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Database dosyası var mı kontrol et
if (!fs.existsSync(dbPath)) {
  console.log('❌ database.sqlite bulunamadı!');
  process.exit(1);
}

// Yedekle
fs.copyFileSync(dbPath, backupPath);

console.log(`✅ Yedek oluşturuldu: ${backupPath}`);

// Eski yedekleri temizle (7 günden eski)
const files = fs.readdirSync(backupDir);
const sevenDaysAgo = moment().subtract(7, 'days');

files.forEach(file => {
  if (file.startsWith('laguts_backup_')) {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const fileDate = moment(stats.mtime);
    
    if (fileDate.isBefore(sevenDaysAgo)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Eski yedek silindi: ${file}`);
    }
  }
});