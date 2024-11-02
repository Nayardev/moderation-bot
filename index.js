const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

// Crée une nouvelle instance du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Remplace 'YOUR_BOT_TOKEN' par le token de ton bot
const TOKEN = '';

// Dès que le bot est prêt
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
    
    // Définit un statut par défaut
    setDefaultStatus();
});

// Fonction pour définir un statut par défaut
function setDefaultStatus() {
    client.user.setPresence({
        activities: [{ name: 'Bonjour!', type: 'WATCHING' }],
        status: 'online',
    });
}

// Fonction pour créer un rôle Muted si inexistant
async function createMutedRole(guild) {
    let mutedRole = guild.roles.cache.find(role => role.name === 'Muted');
    if (!mutedRole) {
        try {
            mutedRole = await guild.roles.create({
                name: 'Muted',
                color: '#818386',
                permissions: []
            });

            guild.channels.cache.forEach(async (channel) => {
                await channel.permissionOverwrites.create(mutedRole, {
                    SendMessages: false,
                    Speak: false,
                    AddReactions: false
                });
            });
        } catch (err) {
            console.error("Erreur lors de la création du rôle Muted : ", err);
        }
    }
    return mutedRole;
}

// Commande de kick
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!kick')) {
        if (!message.member.permissions.has('KickMembers')) {
            return message.reply("Tu n'as pas la permission de kicker des membres.");
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply("Merci de mentionner un utilisateur à kicker.");

        try {
            await user.kick();
            message.channel.send(`${user.user.tag} a été kické.`);
        } catch (err) {
            console.error(err);
            message.reply("Une erreur s'est produite en essayant de kicker l'utilisateur.");
        }
    }
});

// Commande de ban
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!ban')) {
        if (!message.member.permissions.has('BanMembers')) {
            return message.reply("Tu n'as pas la permission de bannir des membres.");
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply("Merci de mentionner un utilisateur à bannir.");

        try {
            await user.ban();
            message.channel.send(`${user.user.tag} a été banni.`);
        } catch (err) {
            console.error(err);
            message.reply("Une erreur s'est produite en essayant de bannir l'utilisateur.");
        }
    }
});

// Commande d'avertissement
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!warn')) {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply("Tu n'as pas la permission d'avertir des membres.");
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply("Merci de mentionner un utilisateur à avertir.");

        const reason = message.content.split(' ').slice(2).join(' ') || "Aucune raison spécifiée";

        try {
            message.channel.send(`${user.user.tag} a été averti.`);
            await user.send(`Tu as reçu un avertissement sur **${message.guild.name}** pour la raison suivante : ${reason}`);
        } catch (err) {
            console.error(err);
            message.reply("Une erreur s'est produite en essayant d'envoyer un avertissement.");
        }
    }
});

// Commande de mute avec une durée
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!mute')) {
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply("Tu n'as pas la permission de mute des membres.");
        }

        const args = message.content.split(' ').slice(1);
        const user = message.mentions.members.first();
        const duration = parseInt(args[1]);

        if (!user) return message.reply("Merci de mentionner un utilisateur à mute.");
        if (!duration || isNaN(duration)) return message.reply("Merci de spécifier une durée en minutes pour le mute.");

        const mutedRole = await createMutedRole(message.guild);
        try {
            await user.roles.add(mutedRole);
            message.channel.send(`${user.user.tag} a été mute pour ${duration} minute(s).`);
            
            // Envoi d'un message privé à l'utilisateur pour l'informer qu'il a été mute
            try {
                await user.send(`Tu as été mute sur **${message.guild.name}** pour ${duration} minute(s).`);
            } catch (err) {
                console.error("Erreur lors de l'envoi du message privé : ", err);
            }

            setTimeout(async () => {
                if (user.roles.cache.has(mutedRole.id)) {
                    await user.roles.remove(mutedRole);
                    message.channel.send(`${user.user.tag} n'est plus mute.`);

                    // Envoi d'un message privé à l'utilisateur pour l'informer qu'il a été démute
                    try {
                        await user.send(`Tu as été démute sur **${message.guild.name}**.`);
                    } catch (err) {
                        console.error("Erreur lors de l'envoi du message privé : ", err);
                    }
                }
            }, duration * 60000);
        } catch (err) {
            console.error("Erreur lors de l'application du mute : ", err);
            message.reply("Une erreur s'est produite en essayant de mute l'utilisateur.");
        }
    }
});


// Commande pour démute un utilisateur
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!unmute')) {
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply("Tu n'as pas la permission de démute des membres.");
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply("Merci de mentionner un utilisateur à démute.");

        const mutedRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        if (!mutedRole) return message.reply("Le rôle Muted n'existe pas sur ce serveur.");

        try {
            if (user.roles.cache.has(mutedRole.id)) {
                await user.roles.remove(mutedRole);
                message.channel.send(`${user.user.tag} n'est plus mute.`);

                // Envoi d'un message privé à l'utilisateur pour l'informer qu'il a été démute
                try {
                    await user.send(`Tu as été démute sur **${message.guild.name}**.`);
                } catch (err) {
                    console.error("Erreur lors de l'envoi du message privé : ", err);
                }
            } else {
                message.reply("Cet utilisateur n'est pas mute.");
            }
        } catch (err) {
            console.error("Erreur lors du démute : ", err);
            message.reply("Une erreur s'est produite en essayant de démute l'utilisateur.");
        }
    }
});


// Commande help
client.on('messageCreate', (message) => {
    if (message.content === '!help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Commandes de Modération")
            .setDescription("Voici les commandes disponibles pour la modération du serveur :")
            .addFields(
                { name: '!kick @membre', value: "Expulse un membre du serveur." },
                { name: '!ban @membre', value: "Bannit un membre du serveur." },
                { name: '!warn @membre', value: "Envoie un avertissement à un membre." },
                { name: '!mute @membre durée', value: "Mute un membre pour la durée spécifiée en minutes." },
                { name: '!unmute @membre', value: "Démute un membre mute." },
                { name: '!setstatus nouveau statut', value: "Change le statut du bot." }
            )
            .setFooter({ text: 'Bot de modération - Commandes de base' });

        message.channel.send({ embeds: [helpEmbed] });
    }
});

// Commande pour changer le statut du bot
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!setstatus')) {
        // Vérifie si l'utilisateur a la permission de gérer le serveur
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply("Tu n'as pas la permission de changer le statut du bot.");
        }

        // Récupère le nouveau statut en enlevant la commande et l'espace
        const newStatus = message.content.split(' ').slice(1).join(' ');

        // Vérifie si un statut a été fourni
        if (!newStatus) {
            return message.reply("Merci de spécifier un nouveau statut.");
        }

        // Change le statut du bot
        try {
            await client.user.setPresence({
                activities: [{ name: newStatus, type: 'WATCHING' }], // Type d'activité
                status: 'online', // Statut du bot
            });
            message.channel.send(`Le statut du bot a été changé en : "${newStatus}".`);
        } catch (error) {
            console.error("Erreur lors du changement de statut : ", error);
            message.reply("Une erreur s'est produite lors du changement de statut.");
        }
    }
});

// Connexion du bot
client.login(TOKEN)
