const config = require("../../config.json");
const { Client, Message, MessageEmbed } = require("discord.js");
const UserSchema = require("../../utils/Schemas/User");
const mailer = require("nodemailer")
const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
const bycrypt = require("bcrypt");

const transporter = mailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    auth: config.mail.auth
})

const passwordGen = (length) => {
    const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let password = "";

    for (let i = 0; i < length; i++) {
        password += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }

    return password;
}

module.exports = {
    name: "link",
    description: "link panel account to discord account",
    usage: "link",
    example: "link",
    requiredPermissions: [],
    checks: [],
    /**
     * @param {Client} client 
     * @param {Message} message 
     * @param {Array} args 
     */
    run: async (client, message, args) => {
        const userCategory = client.channels.cache.get(config.discord.categories.userCreation);

        if (!userCategory) {
            message.reply("The user category does not exist! Please contact a admin!");
            return;
        }

        if (await UserSchema.findOne({ userId: message.author.id })) {
            message.reply("You already have an account!");
            return;
        }

        for (const chan of message.guild.channels.cache.values()) {
            if (chan.name !== `${message.author.tag.replace("#", "-").toLowerCase()}` && chan?.parentId !== config.discord.categories.userCreation) continue;

            chan.delete()
        }

        const chan = await userCategory.createChannel(`${message.author.username}-${message.author.discriminator}`, {
            type: "text",
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: ["VIEW_CHANNEL", "SEND_MESSAGES"],
                }, {
                    id: message.author.id,
                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"],
                },
            ],
        }).catch(console.error);

        message.reply(`Please check ${chan} to create an account!`)

        const verification = passwordGen(15);

        let questions = [{
            question: "What is your email?",
            time: 300000,
            value: null,
            afterChecks: [{
                check: async (value) => {
                    if (!emailRegex.test(value)) {
                        return false;
                    } else {
                        const users = JSON.parse(await client.cache.get("users"));
                        const user = users.find(u => u.email === value);

                        if (!user) {
                            return false;
                        }

                        return true;
                    }
                },
                message: "Invalid Email",
            }]
        }, {
            id: "verify",
            question: "A verification code has been sent to your email. Please enter it here.",
            time: 300000,
            value: null,
            afterChecks: [{
                check: (value) => value === verification,
                message: "Invalid verification code!",
            }]
        }]

        let creationEmbed = new MessageEmbed()
            .setColor("GREEN")
            .setFooter({
                text: "You can type 'cancel' to cancel the creation process!",
            })

        const msg = await chan.send({ content: `${message.author}`, embeds: [creationEmbed] })

        for (const question of questions) {

            if (question?.id == "verify") {
                const emailData = {
                    from: config.mail.from,
                    to: questions[0]?.value,
                    subject: 'Verification Code',
                    html: `<h1>Verification Code</h1>
                    <p>Your verification code is: ${verification}</p>
                    <p>Please enter this in the Discord channel!</p>
                    <p>This code will expire in 10 minutes!</p>
                    <p>If you did not request this, please ignore this email!</p>
                    <footer>Requested By: ${message.author.tag} (${message.author.id})</footer>`
                };

                await transporter.sendMail(emailData).catch((err) => {
                    console.log(err);
                    message.channel.send("An error occured while sending the email!");

                    setTimeout(() => {
                        chan.delete();
                    }, 5000);
                });
            }

            creationEmbed.description = question.question;

            await msg.edit({ embeds: [creationEmbed] })


            const collectedMsgs = await chan.awaitMessages({
                filter: m => m.author.id === message.author.id,
                time: question.time,
                max: 1,
            });

            const collectedMsg = collectedMsgs?.first()?.content?.trim();

            if (collectedMsgs?.first()) collectedMsgs?.first()?.delete()

            if (!collectedMsg) {
                chan.send("You took too long to answer the question!");
                chan.send(`Account Linking failed!`);

                setTimeout(() => {
                    chan.delete();
                }, 5000);
                return;
            }

            if (collectedMsg.toLowerCase() === "cancel") {
                chan.send("You have cancelled the linking process!");
                return;
            }

            question.value = collectedMsg;

            for (const check of question.afterChecks) {
                if (!await check.check(question.value)) {
                    chan.send(check.message);
                    chan.send(`Account Linking failed!`);

                    setTimeout(() => {
                        chan.delete();
                    }, 5000);

                    return;
                }
            }

        }

        const salt = await bycrypt.genSalt(15);

        const hash = await bycrypt.hash(questions[0].value, salt);

        const userData = JSON.parse(await client.cache.get("users"));

        const user = userData.find(u => u.email === questions[0].value);

        await UserSchema.create({
            userId: message.author.id,
            consoleId: user.id,
            email: hash,
            username: user.username,
            domains: [],
            linkDate: Date.now(),
            premiumCount: 0,
            premiumUsed: 0,
        })

        creationEmbed.description = `Account Linked! Successfully linked ${user.username} to your account!`;
        creationEmbed.footer = null;

        await msg.edit({ embeds: [creationEmbed] })

        return;

    },
}