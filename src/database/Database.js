const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');

class Database {
    constructor() {
        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: process.env.DB_PATH || './database.sqlite',
            logging: false,
            retry: {
                max: 5,
                timeout: 3000
            }
        });

        this.models = {};
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Modelleri tanımla
            await this.defineModels();
            
            // VERİTABANINI SADECE GEREKİRSE SİNC ET
            await this.sequelize.sync({ force: false, alter: false }); // alter: false yap!
            
            // Test bağlantısı
            await this.sequelize.authenticate();
            
            this.initialized = true;
            console.log('✅ Veritabanı bağlantısı başarılı!');
        } catch (error) {
            console.error('❌ Veritabanı bağlantı hatası:', error.message);
            
            // Hata durumunda sadece tabloları oluştur
            try {
                await this.createTablesManually();
                console.log('✅ Tablolar manuel oluşturuldu!');
            } catch (manualError) {
                console.error('❌ Manuel tablo oluşturma hatası:', manualError);
            }
        }
    }

    async defineModels() {
        // Guild Model - BASİTLEŞTİRİLDİ
        this.models.Guild = this.sequelize.define('Guild', {
            guildId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            },
            categoryId: DataTypes.STRING,
            channelId: DataTypes.STRING,
            defaultBitrate: {
                type: DataTypes.INTEGER,
                defaultValue: 64000
            },
            defaultUserLimit: {
                type: DataTypes.INTEGER,
                defaultValue: 10
            },
            afkEnabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            afkTime: {
                type: DataTypes.INTEGER,
                defaultValue: 5
            },
            afkAction: {
                type: DataTypes.STRING,
                defaultValue: 'none'
            },
            defaultTheme: {
                type: DataTypes.STRING,
                defaultValue: '💙'
            },
            maxRooms: {
                type: DataTypes.INTEGER,
                defaultValue: 5
            }
        }, {
            timestamps: true
        });

        // VoiceRoom Model - BASİTLEŞTİRİLDİ
        this.models.VoiceRoom = this.sequelize.define('VoiceRoom', {
            channelId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            },
            guildId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            ownerId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            name: DataTypes.STRING,
            bitrate: DataTypes.INTEGER,
            userLimit: DataTypes.INTEGER,
            locked: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            roomType: DataTypes.STRING,
            theme: DataTypes.STRING
        }, {
            timestamps: true
        });

        // İLİŞKİLERİ KALDIR - Foreign key sorunu çöz
        // this.models.Guild.hasMany(this.models.VoiceRoom, { foreignKey: 'guildId' });
        // this.models.VoiceRoom.belongsTo(this.models.Guild, { foreignKey: 'guildId' });
    }

    async createTablesManually() {
        // SQL komutları ile manuel tablo oluştur
        const createGuildsTable = `
            CREATE TABLE IF NOT EXISTS Guilds (
                guildId VARCHAR(255) PRIMARY KEY,
                categoryId VARCHAR(255),
                channelId VARCHAR(255),
                defaultBitrate INTEGER DEFAULT 64000,
                defaultUserLimit INTEGER DEFAULT 10,
                afkEnabled BOOLEAN DEFAULT 0,
                afkTime INTEGER DEFAULT 5,
                afkAction VARCHAR(50) DEFAULT 'none',
                defaultTheme VARCHAR(10) DEFAULT '💙',
                maxRooms INTEGER DEFAULT 5,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createVoiceRoomsTable = `
            CREATE TABLE IF NOT EXISTS VoiceRooms (
                channelId VARCHAR(255) PRIMARY KEY,
                guildId VARCHAR(255) NOT NULL,
                ownerId VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                bitrate INTEGER DEFAULT 64000,
                userLimit INTEGER DEFAULT 10,
                locked BOOLEAN DEFAULT 0,
                roomType VARCHAR(50),
                theme VARCHAR(10),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await this.sequelize.query(createGuildsTable);
        await this.sequelize.query(createVoiceRoomsTable);
        console.log('✅ Tablolar manuel oluşturuldu!');
    }

    // Kalan metodlar aynı...
    async getGuild(guildId) {
        const [guild, created] = await this.models.Guild.findOrCreate({
            where: { guildId },
            defaults: { guildId }
        });
        return guild;
    }

    async updateGuild(guildId, data) {
        const [affected] = await this.models.Guild.update(data, {
            where: { guildId }
        });
        return affected > 0;
    }

    async createVoiceRoom(data) {
        try {
            const room = await this.models.VoiceRoom.create(data);
            console.log(`✅ Oda oluşturuldu: ${data.channelId}`);
            return room;
        } catch (error) {
            console.error('❌ Oda oluşturma hatası:', error.message);
            throw error;
        }
    }

    async deleteVoiceRoom(channelId) {
        const deleted = await this.models.VoiceRoom.destroy({
            where: { channelId }
        });
        return deleted > 0;
    }

    async getVoiceRoom(channelId) {
        return await this.models.VoiceRoom.findOne({
            where: { channelId }
        });
    }

    async getGuildRooms(guildId) {
        return await this.models.VoiceRoom.findAll({
            where: { guildId }
        });
    }

    async getRoomByOwner(ownerId, guildId) {
        return await this.models.VoiceRoom.findOne({
            where: { ownerId, guildId }
        });
    }

    async updateRoom(channelId, data) {
        const [affected] = await this.models.VoiceRoom.update(data, {
            where: { channelId }
        });
        return affected > 0;
    }

    async getStats() {
        const totalGuilds = await this.models.Guild.count();
        const totalRooms = await this.models.VoiceRoom.count();
        
        return {
            totalGuilds,
            totalRooms,
            status: 'active'
        };
    }
}

module.exports = Database;