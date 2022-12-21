const config = require("../../config.json");
const { Client, Message, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, DiscordAPIError } = require("discord.js");
const UserSchema = require("../../utils/Schemas/User");
const Pterodactyl = require('../../utils/pterodactyl/index');
const ptero = new Pterodactyl();
const dns = require('dns');
const axios = require('axios');

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
        const user = await UserSchema.findOne({ userId: message.author.id });

        //Makes sure the user has an account linked.
        if (!user) {
            message.reply("You are not linked to a panel account.");
            return;
        };

        let proxyDestinations = "\n";
        config.proxies.forEach(m => {
            proxyDestinations += `${m.ip} (${m.locationNickname})`;
        });

        const proxyEmbed = new EmbedBuilder()
        .setTitle('How to Proxy a domain to a server?')
        .setColor('Blue')
        .addFields(
            { name: "DBH Domains:", value: "`*.rick-roll.xyz \n*.never-gonna-give-you-up.xyz \n*.never-gonna-let-you-down.xyz \n*.never-gonna-make-you-cry.xyz \n*.never-gonna-run-around-and-desert-you.xyz \n*.never-gonna-say-goodbye.xyz \n*.never-gonna-tell-a-lie-and-hurt-you.xyz \n *.only-fans.club (Donators Only)`", inline: false },
            { name: "Where do I point my own domain?", value: `You can point to the following proxy locations: ${proxyDestinations}`, inline: false },
            { name: "How do I unproxy a domain?", value: `\`${config.bot.prefix}server unproxy <domain>\``, inline: false }
        )
        .setFooter({text: "DBH Bot", iconURL: client.user.displayAvatarURL()})
        .setTimestamp()

        //No server ID or Domain was passed.
        if(!args[0] || !args[1]) return await message.channel.send({embeds: [proxyEmbed], content: `${message.author.toString()}`});

        if(args[0].toLocaleLowerCase().includes('only-fans.club')) {
            if(!message.member.roles.cache.some(r => r.id == config.discord.roles.donated)) return message.channel.send('Sorry mate, *.only-fans.club is only available to donators. Hey, if you want to, you can donate at: https://paypal.me/DanBotHosting');
        };

        //Checks if this domain is already owned by someone in DBH.
        const linkedAlready = await (await UserSchema.find()).filter(users.domains && users.domains.includes(args[0]));

        if(linkedAlready){
            return message.channel.send('Sorry, this domain is already linked.');
        };

        //Checks if this is a valid domain.
        if (!/^[a-zA-Z0-9.-]+$/.test(args[0]) || args[0].length > 253) {
            return message.channel.send('That is not a valid domain! Your domain should not contain wildcards, protocols (https or http), and should not contain characters like /.')
        };

        const dnsCheck = await new Promise((res, rej) => {
            const options = {
                family: 4,
                hints: dns.ADDRCONFIG | dns.V4MAPPED,
            };

            dns.lookup(args[0], options, (err, address, family) =>
                res({err, address, family})
            );
        });

        //Checks if the domain is pointed to any of the proxy IPs.
        if(!config.proxies.map(e => e.ip).includes(dnsCheck.address)) {
            const notValidRecord = new EmbedBuilder()
            .setTitle('Error: No DNS record found!')
            .setDescription('Your domain is not being pointed to any of the proxy servers!')
            .addFields(
                { name: "Check:", value: "If you are using Cloudflare, make sure the record is using DNS only mode! Your button should appear gray, not orange!", inline: false },
                { name: "Check:", value: "It can take up to 24 hours for a domain record to show up!", inline: false },
                { name: "Check:", value: `Make sure your domain record is updated. You **must** use an A record type. You can double check the target is one of the proxy servers by running ${config.bot.prefix}server proxy`, inline: false },
            )

            return message.channel.send({embeds: [notValidRecord]});
        };

        const serverId = args[1];

        //No server ID was passed.
        if (!serverId) return message.reply('Please specify a server ID.');

        const usersServers = (await ptero.servers(user.consoleId))?.data?.attributes?.relationships?.servers?.data;

        if (!usersServers) return message.reply("You don't have any servers.");

        const server = usersServers.find(s => s.attributes.identifier === serverId || serverId.startsWith(s.attributes.identifier));

        if (!server) return message.reply("You don't have a server with that ID.");

        const proxyResponse = await axios({
            url: config.proxies.filter(m => m.ip == dnsCheck.address)[0].proxyUrl + "/create",
            method: 'POST',
            maxRedirects: 5,
            timeout: 10 * 1000,
            headers: {
                'password': config.proxies.filter(m => m.ip == dnsCheck.address)[0].pass,
                'User-Agent': "DBH" //Most likely running behind Cloudflare.
            },
            data: {
                domain: args[0],
                ip: server.data.attributes.sftp_details.ip,
                port: server.data.attributes.relationships.allocations.data[0].attributes.port,
                ssl: true
            }
        }).then(async (proxyResponse) => {
            if(!proxyResponse.success) return;

            let updateDomains = user.domains;
            
            updateDomains.push({
                timeSaved: `${Date.now()}`,
                domain: args[0],
                proxyLocation: config.proxies.filter(m => m.ip == dnsCheck.address)[0].ip,
                hostname: server.data.attributes.sftp_details.ip,
                port: server.data.attributes.relationships.allocations.data[0].attributes.port
            });
            

            await UserSchema.findOneAndUpdate({username: user.username}, { domains: [updateDomains] }).catch(console.error);

            message.channel.send(`Successfully proxied your domain! ${args[0]}`);
        }).catch(error => {
            if(error.status == 400);

            message.channel.send('Proxying your domain failed, please contact an Admin, or try again.');
        });
    }
}