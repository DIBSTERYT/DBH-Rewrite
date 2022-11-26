const config = require("../../config.json");
const { Client, Message, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const UserSchema = require("../../utils/Schemas/User");
const Pterodactyl = require('../../utils/pterodactyl/index');
const ptero = new Pterodactyl();

module.exports = {
    name: "proxy",
    description: "Proxy a domain to your server.",
    usage: "proxy <domain> <server>",
    example: "proxy danbot.host abc123",
    requiredPermissions: [],
    checks: [{
        check: () => config.discord.commands.serverCommandsEnabled,
        error: "The server commands are disabled!"
    }],
    /**
     * @param {Client} client 
     * @param {Message} message 
     * @param {string[]} args 
     */
    run: async (client, message, args) => {
        const ProxyEmbed = new EmbedBuilder()
        .setTitle('__**How to link a domain to your server.**__')
        .setColor('Blue')
        .setDescription('`' + config.bot.prefix + 'server proxy <domain> <serverid>`' +
        '\nMake sure to replace <domain> with your domain and <serverid> with the ID of your server. ' +
        'You can find your server id by running `' + config.bot.prefix + 'server list`' +
        '\nYou can link your own domain by creating a DNS A Record pointing either \`164.132.74.251\` or \`192.95.42.75\`! ' +
        'If you are using Cloudflare make sure the you are using DNS Only mode!' +
        '\nOr you can use the free Danbot Host domains:' +
        '\n `*.never-gonna-give-you-up.xyz' +
        '\n*.never-gonna-let-you-down.xyz' +
        '\n*.never-gonna-make-you-cry.xyz' +
        '\n*.never-gonna-run-around-and-desert-you.xyz' +
        '\n*.never-gonna-say-goodbye.xyz' +
        '\n*.never-gonna-tell-a-lie-and-hurt-you.xyz' +
        '\n*.rick-roll.xyz`' +
        '\nFor donators there is also the domain `*.only-fans.club`.')
        .setFooter({text: "DBH Bot"})
        .setTimestamp()

        //No server ID or Domain was passed.
        if(!args[0] || !args[1]) return await message.channel.send({embeds: [ProxyEmbed], content: `${message.author.toString()}`});

        if(args[0].toLocaleLowerCase().includes('only-fans.club')) {
            if(!message.member.roles.cache.some(r => r.id == config.discord.roles.donated)) return message.channel.send('Sorry mate, *.only-fans.club is only available to donators. Hey, if you want to, you can donate at: https://paypal.me/DanBotHosting')
        };

        //Checks if this domain is already owned by someone in DBH.
        const LinkedAlready = await (await UserSchema.find()).filter(users.domains && users.domains.includes(args[0]));

        if(LinkedAlready){
            return message.channel.send('Sorry, this domain is already linked.');
        };

        //Checks if this is a valid domain.
        if (!/^[a-zA-Z0-9.-]+$/.test(args[0]) || args[0].length > 253) {
            return message.channel.send('That is not a valid domain! \nExample of domains:\nValid: danbot.host\nInvalid: <https://danbot.host/>')
        };

        //Now I need to figure out what package I want to use for this.
    }
}