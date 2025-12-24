module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        // Boş odaları temizle
        if (oldState.channel) {
            setTimeout(async () => {
                const channel = oldState.channel;
                if (channel && channel.members.size === 0) {
                    const room = await client.db.getVoiceRoom(channel.id);
                    if (room) {
                        await channel.delete().catch(() => {});
                        await client.db.deleteVoiceRoom(channel.id);
                    }
                }
            }, 30000);
        }
    }
};