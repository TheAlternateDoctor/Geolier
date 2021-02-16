const discord = require('discord.js');
const fs = require('fs');
const client = new discord.Client();

client.on('ready', () => {
    console.log('Prêt!');
})

var parameters = JSON.parse(fs.readFileSync('parameters.json'));
var botUsersRole = {};
var botUsersChannel = {};

//Récupère le token dans login.json. J'ajouterais probablement d'autres choses, comme un support MySQL.
var token = JSON.parse(fs.readFileSync('login.json')).token;
client.login(token);
try {
    var botUsersDB = JSON.parse(fs.readFileSync('data.json'));
} catch (error) {
    if (error.message.indexOf("ENOENT") === 0) {
        fs.writeFileSync('data.json', '{"users":{}}')
        var botUsersDB = JSON.parse('{"users":{}}');
    }
    else client.destroy();
}

//Interaction avec les utilisateurs
client.on('message', message => {
    // Si le message contient le préfixe
    var content = message.content;
    if (content[0] === parameters.prefix) {
        content = content.substring(1);
        var user = message.mentions.users.first();
        var member = message.guild.member(user);
        // Commence l'analyse
        if (content === "ping")
            message.channel.send('pong');
        else if (content.indexOf("prefix") === 0) {
            content = content.substring(7);
            parameters.prefix = content;
            fs.writeFileSync('parameters.json', JSON.stringify(parameters));
            message.channel.send(`Nouveau préfixe: \`${parameters.prefix}\``);
        }
        else if (content.indexOf("info") === 0 && member) {
            if (botUsersDB.users[user.id]) {
                var memberStats = botUsersDB.users[user.id];
                console.log(memberStats);
                var terminator = ',';
                var string = `<@${member.id}> a passé `;
                for (const [key, value] of Object.entries(memberStats)) {
                    if (Object.keys(memberStats).indexOf(key) === Object.keys(memberStats).length - 1) {
                        terminator = '.';
                        string += " et ";
                    }
                    var days = Math.floor((value[1] / (1000 * 60 * 60 * 24)).toFixed(1));
                    if (days > 0) string += `${days} jours, `; value[1] -= Math.floor(days) * 24 * 60 * 60 * 1000
                    var hours = Math.floor((value[1] / (1000 * 60 * 60)).toFixed(1));
                    if (hours > 0) string += `${hours} h`; value[1] -= Math.floor(hours) * 60 * 60 * 1000
                    var minutes = Math.floor((value[1] / (1000 * 60)).toFixed(1));
                    if (minutes > 0) string += `${minutes}mn et `; value[1] -= Math.floor(minutes) * 60 * 1000
                    var seconds = (value[1] / 1000).toFixed(1);
                    if (seconds > 0) string += `${seconds} secondes`
                    if (value[0]) {
                        var channel = client.channels.cache.get(key);
                        string += ` dans ${channel.name}${terminator}`
                    }
                    else
                        string += ` en temps que ${key}${terminator}`
                }
                message.channel.send(string);
            } else
                message.channel.send(`Aucune donnée sur <@${member.id}>`);
        }
        else if (content.indexOf("stop") === 0) {
            message.channel.send("Au revoir. \*Début de La Marseillaise*");
            fs.writeFileSync('data.json', JSON.stringify(botUsersDB));
            client.destroy();
            process.exit();
        }
    }
});

//Vérification de la connection
client.on("voiceStateUpdate", (oldVoiceState, newVoiceState) => { // Listening to the voiceStateUpdate event
    var member = oldVoiceState.member;
    if (newVoiceState.channel && parameters.channels.includes(newVoiceState.channel.id)) { // The member connected to a channel.
        botUsersChannel[member.id] = {};
        botUsersChannel[member.id][newVoiceState.channel.id] = new Date();
    } else if (oldVoiceState.channel && parameters.channels.includes(oldVoiceState.channel.id)) { // The member disconnected from a channel.
        if (member.id in botUsersDB.users) {
            if (oldVoiceState.channel.id in botUsersDB.users[member.id])
                botUsersDB.users[member.id][oldVoiceState.channel.id][1] = ((new Date()).getTime()) - botUsersChannel[member.id][oldVoiceState.channel.id].getTime() + botUsersDB.users[member.id][oldVoiceState.channel.id][1];
            else
                botUsersDB.users[member.id][oldVoiceState.channel.id] = [true, ((new Date()).getTime()) - botUsersChannel[member.id][oldVoiceState.channel.id].getTime()];
        } else {
            botUsersDB.users[member.id] = {};
            botUsersDB.users[member.id][oldVoiceState.channel.id] = [true, ((new Date()).getTime()) - botUsersChannel[member.id][oldVoiceState.channel.id].getTime()];
        }
    };
});

//Vérification des rôles
client.on('guildMemberUpdate', (oldUser, newUser) => {
    var oldRoles = [];
    var newRoles = [];
    oldUser.roles.cache.forEach(element => oldRoles.push(element.name));
    newUser.roles.cache.forEach(element => newRoles.push(element.name));
    var newRole = newRoles.filter(x => !oldRoles.includes(x))[0];
    if (newRole === undefined)
        var newRole = oldRoles.filter(x => !newRoles.includes(x))[0];
    console.log(oldRoles);
    console.log(newRoles);
    console.log(`User ${oldUser.id} has been updated with role ${newRole}!`);
    if (!oldUser.roles.cache.find(r => parameters.roles.includes(r.name)) && newUser.roles.cache.find(r => parameters.roles.includes(r.name))) {
        botUsersRole[oldUser.id] = {};
        botUsersRole[oldUser.id][newRole] = new Date();
    }
    else if (oldUser.roles.cache.find(r => parameters.roles.includes(r.name)) && !newUser.roles.cache.find(r => parameters.roles.includes(r.name))) {
        if (oldUser.id in botUsersDB.users) {
            if (newRole in botUsersDB.users[oldUser.id])
                botUsersDB.users[oldUser.id][newRole][1] = ((new Date()).getTime()) - botUsersRole[oldUser.id][newRole].getTime() + botUsersDB.users[oldUser.id][newRole][1];
            else
                botUsersDB.users[oldUser.id][newRole] = [false, ((new Date()).getTime()) - botUsersRole[oldUser.id][newRole].getTime()];
        } else {
            botUsersDB.users[oldUser.id] = {};
            botUsersDB.users[oldUser.id][newRole] = [false, ((new Date()).getTime()) - botUsersRole[oldUser.id][newRole].getTime()];
        }
    }
});

process.on('SIGINT', function () {
    console.log("Extinction du bot!");
    fs.writeFileSync('data.json', JSON.stringify(botUsersDB));
    client.destroy();
    process.exit();
});