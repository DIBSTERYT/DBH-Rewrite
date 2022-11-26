const config = require("../../config.json");
const { Client, Message, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const UserSchema = require("../../utils/Schemas/User");
const Pterodactyl = require('../../utils/pterodactyl/index');
const ptero = new Pterodactyl();

module.exports = {
    name: "unproxy",
    description: "Unproxy a domain from a server.",
    usage: "unproxy <domain>",
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
    }
}