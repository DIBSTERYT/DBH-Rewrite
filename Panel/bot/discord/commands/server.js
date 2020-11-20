const axios = require('axios');
var pretty = require('prettysize');
const fs = require('fs');
const path = require('path');
const serverCreateSettings = require('../../../createData');

const {
    NodeSSH
} = require('node-ssh')
const ssh = new NodeSSH()
const rif = require('replace-in-file');

exports.run = async (client, message, args) => {

    let helpEmbed = new Discord.RichEmbed()
        .setColor(`RED`).setDescription(`List of servers: (use ${config.DiscordBot.Prefix}server create <type> <name>)`)
        .addField(`__**Minecraft:**__`, "Forge \nPaper \nBedrock \nPocketmineMP", true)
        .addField(`__**Grand Theft Auto:**__`, "FiveM \nalt:V \nmultitheftauto \nRage.MP \nSA-MP", true)
        .addField(`__**Bots:**__`, "NodeJS \nPython \nJava \naio", true)
        .addField(`__**Source Engine:**__`, "GMod \nCS:GO \nARK:SE", true)
        .addField(`__**Voice Servers:**__`, "TS3 \nMumble", true)
        .addField(`__**SteamCMD:**__`, "Rust", true)
        .addField(`__**Databases:**__`, "MongoDB \nRedis \nPostgres", true)
        .setFooter("Example: " + config.DiscordBot.Prefix + "server create NodeJS Testing Server")

    const serverName = message.content.split(' ').slice(3).join(' ') || "change me! (Settings -> SERVER NAME)";
    let consoleID = userData.get(message.author.id);
    
    if (consoleID == null) {
        message.channel.send("Oh no, Seems like you do not have an account linked to your discord ID.\n" +
        "If you have not made an account yet please check out `" +
        config.DiscordBot.Prefix + "user new` to create an account \nIf you already have an account link it using `" +
        config.DiscordBot.Prefix + "user link`");
        return;
    }

    let data = serverCreateSettings.createParams(serverName, consoleID.consoleID);
    
    if (!args[0]) {
        //No args
        let embed = new Discord.RichEmbed()
            .addField('__**Commands**__', 'Create a server: `' + config.DiscordBot.Prefix + 'server create type servername` \nServer Types: `' + config.DiscordBot.Prefix + 'server create list` \nServer Status: `' + config.DiscordBot.Prefix + 'server status serverid` \nLink Domain`' + config.DiscordBot.Prefix + 'server proxy domainhere serveridhere \nUnlink domain: `' + config.DiscordBot.Prefix + 'server unproxy domainhere` \nDelete server: `' + config.DiscordBot.Prefix + 'server delete serveridhere`')
        message.channel.send(embed)

    } else if (args[0].toLowerCase() == "create") {
        //Do server creation things
        if (!args[1]) {
            message.channel.send(helpEmbed)
            return;
        }

        let types = {
            nodejs: data.nodejs,
            python: data.python,
            aio: data.aio,
            java: data.java,
            paper: data.paper,
            forge: data.forge,
            fivem: data.fivem,
            "alt:v": data.altv,
            multitheftauto: data.multitheftauto,
            "rage.mp": data.ragemp,
            "sa-mp": data.samp,
            bedrock: data.bedrock,
            pocketminemp: data.pocketminemp,
            gmod: data.gmod,
            "cs:go": data.csgo,
            "ark:se": data.arkse,
            ts3: data.ts3,
            mumble: data.mumble,
            rust: data.rust,
            mongodb: data.mongodb,
            redis: data.redis,
            postgres: data.postgres,
        }

        if (Object.keys(types).includes(args[1].toLowerCase())) {
            serverCreateSettings.createServer(types[args[1].toLowerCase()])
                .then(response => {
                    let embed = new Discord.RichEmbed()
                        .setColor(`GREEN`)
                        .addField(`__**Status:**__`, response.statusText)
                        .addField(`__**Created for user ID:**__`, consoleID.consoleID)
                        .addField(`__**Server name:**__`, serverName)
                        .addField(`__**Type:**__`, args[1].toLowerCase())
                    message.channel.send(embed)
                }).catch(error => {
                    message.channel.send(new Discord.RichEmbed().setColor(`RED`).addField(`__**FAILED:**__`, "Please contact a host admin. \n\nError: `" + error + "`"))
                    console.log(error)
                })
            return;
        }
        message.channel.send(helpEmbed)

    } else if (args[0].toLowerCase() == "delete") {
        //delete server things
        if (!args[1]) {
            message.channel.send('Command format: `' + config.DiscordBot.Prefix + 'server delete serveridhere`')
        } else {
            message.channel.send('Checking server `' + args[1] + '`\nPlease allow me 2seconds to fetch this.').then((msg) => {
                axios({
                    url: "https://panel.danbot.host" + "/api/application/users/" + userData.get(message.author.id).consoleID + "?include=servers",
                    method: 'GET',
                    followRedirect: true,
                    maxRedirects: 5,
                    headers: {
                        'Authorization': 'Bearer ' + config.Pterodactyl.apikey,
                        'Content-Type': 'application/json',
                        'Accept': 'Application/vnd.pterodactyl.v1+json',
                    }
                }).then(response => {
                    const preoutput = response.data.attributes.relationships.servers.data
                    const output = preoutput.find(srv => srv.attributes ? srv.attributes.identifier == args[1] : false)


                    setTimeout(async () => {
                        setTimeout(() => {
                            if (!output) {
                                msg.edit('Can\'t find that server :(')
                            } else {

                                if (output.attributes.user == userData.get(message.author.id).consoleID) {
                                    msg.edit('Are you sure you want to delete `' + output.attributes.name + '`?\nPlease type `confirm` to delete this server. You have 1min until this will expire \n\n**You can not restore the server once it has been deleted and/or its files**')
                                    const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, {
                                        time: 60000,
                                        max: 2
                                    });
                                    collector.on('collect', message => {
                                        if (message == "confirm") {
                                            message.delete()
                                            axios({
                                                url: config.Pterodactyl.hosturl + "/api/application/servers/" + output.attributes.id,
                                                method: 'DELETE',
                                                followRedirect: true,
                                                maxRedirects: 5,
                                                headers: {
                                                    'Authorization': 'Bearer ' + config.Pterodactyl.apikey,
                                                    'Content-Type': 'application/json',
                                                    'Accept': 'Application/vnd.pterodactyl.v1+json',
                                                }
                                            }).then(response => {
                                                msg.edit('Server deleted!')
                                                collector.stop()
                                            }).catch(err => {
                                                msg.edit('Error with the node. Please try again later')
                                                collector.stop()
                                            });
                                        } else {
                                            message.delete()
                                            msg.edit('Request cancelled!')
                                            collector.stop()
                                        }
                                    })

                                } else {
                                    message.channel.send('You do not own that server. You cant delete it.')
                                }
                            }
                        }, 500)
                    }, 1000)
                });
            });
        }
    } else if (args[0].toLowerCase() == "manage") {
        message.channel.send('Uh this isnt done yet...')
    } else if (args[0] == "list") {
        message.channel.send('Loading servers...')
        //List servers
        var arr = [];
        axios({
            url: "https://panel.danbot.host" + "/api/application/users/" + userData.get(message.author.id).consoleID + "?include=servers",
            method: 'GET',
            followRedirect: true,
            maxRedirects: 5,
            headers: {
                'Authorization': 'Bearer ' + config.Pterodactyl.apikey,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json',
            }
        }).then(response => {
            const preoutput = response.data.attributes.relationships.servers.data
            //console.log(resources.data.meta)
            arr.push(...preoutput)
            setTimeout(async () => {
                //console.log(arr.length)
                console.log(arr)
                setTimeout(() => {
                    var clean = arr.map(e => "Server Name: `" + e.attributes.name + "`, Server ID: `" + e.attributes.identifier + "`\n")
                    const embed = new Discord.RichEmbed()
                        .addField('__**Your Servers:**__', clean)
                    message.channel.send(embed)
                    //console.log(output)
                }, 500)
            }, 5000)
        });
    } else if (args[0].toLowerCase() == "status") {
        if (!args[1]) {
            let embed = new Discord.RichEmbed()
                .setColor(`GREEN`)
                .addField(`__**Server Status**__`, 'What server would you like to view? Please type: `' + config.DiscordBot.Prefix + 'server status serverid`', true)
            message.channel.send(embed)
        } else {
            message.channel.send('Fetching server...')
            axios({
                url: config.Pterodactyl.hosturl + "/api/client/servers/" + args[1],
                method: 'GET',
                followRedirect: true,
                maxRedirects: 5,
                headers: {
                    'Authorization': 'Bearer ' + config.Pterodactyl.apikeyclient,
                    'Content-Type': 'application/json',
                    'Accept': 'Application/vnd.pterodactyl.v1+json',
                }
            }).then(response => {
                axios({
                    url: config.Pterodactyl.hosturl + "/api/client/servers/" + args[1] + "/resources",
                    method: 'GET',
                    followRedirect: true,
                    maxRedirects: 5,
                    headers: {
                        'Authorization': 'Bearer ' + config.Pterodactyl.apikeyclient,
                        'Content-Type': 'application/json',
                        'Accept': 'Application/vnd.pterodactyl.v1+json',
                    }
                }).then(resources => {
                    let embedstatus = new Discord.RichEmbed()
                        .setColor('GREEN')
                        .addField('**Status**', resources.data.attributes.current_state, true)
                        .addField('**CPU Usage**', resources.data.attributes.resources.cpu_absolute + '%')
                        .addField('**RAM Usage**', pretty(resources.data.attributes.resources.memory_bytes) + '  out of UNLIMITED MB')
                        .addField('**DISK Usage**', pretty(resources.data.attributes.resources.disk_bytes) + '  out of UNLIMITED MB')
                        .addField('**NET Usage**', 'UPLOADED: ' + pretty(resources.data.attributes.resources.network_tx_bytes) + ', DOWNLOADED: ' + pretty(resources.data.attributes.resources.network_rx_bytes))
                        .addField('**NODE**', response.data.attributes.node)
                        .addField('**FULL ID**', response.data.attributes.uuid)
                        .addField('\u200b', '\u200b')
                        .addField('**LIMITS (0 = unlimited)**', 'MEMORY: ' + response.data.attributes.limits.memory + 'MB \nDISK: ' + response.data.attributes.limits.disk + 'MB \nCPU: ' + response.data.attributes.limits.cpu)
                        .addField('**MISC LIMITS**', 'DATABASES: ' + response.data.attributes.feature_limits.databases + '\nBACKUPS: ' + response.data.attributes.feature_limits.backups)
                    message.reply(embedstatus)
                })
            });
        }
    } else if (args[0].toLowerCase() == "proxy") {
        const embed = new Discord.RichEmbed()
            .setTitle('__**How to link a domain to a website/server**__ \nCommand format: ' + config.DiscordBot.Prefix + 'server proxy domainhere serverid')
        if (!args[1]) {
            message.channel.send(embed)
        } else {
            if (!args[2]) {
                message.channel.send(embed)
            } else {
                message.channel.send('Please give me a few seconds. Trying to link that domain!')
                //SSH Connection
                ssh.connect({
                    host: config.SSH.Host,
                    username: config.SSH.User,
                    port: config.SSH.Port,
                    password: config.SSH.Password,
                    tryKeyboard: true,
                })

                //Copy template file. Ready to be changed!
                fs.access(path.resolve(path.dirname(require.main.filename), "proxy/" + args[1].toLowerCase() + ".conf"), fs.constants.R_OK, (err) => {
                    if (!err) {
                        return message.channel.send("This domain has been linked before or is currently linked..")
                    } else {
                        fs.copyFile(path.resolve('./proxy/template.txt'), './proxy/' + args[1] + '.conf', (err) => {
                            if (err) {
                                console.log("Error Found:", err);
                            }
                        })
                        fs.copyFile(path.resolve('./proxy/template.txt'), './proxy/' + args[1] + '.conf', (err) => {
                            if (err) {
                                console.log("Error Found:", err);
                            }
                        })

                        setTimeout(() => {
                            //Change Domain
                            var z = 0;
                            while (z < 5) {
                                const domainchange = rif.sync({
                                    files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                    from: "REPLACE-DOMAIN",
                                    to: args[1].toLowerCase(),
                                    countMatches: true,
                                });
                                z++
                            }

                            //Grab node and port ready for the config 
                            axios({
                                url: config.Pterodactyl.hosturl + "/api/client/servers/" + args[2],
                                method: 'GET',
                                followRedirect: true,
                                maxRedirects: 5,
                                headers: {
                                    'Authorization': 'Bearer ' + config.Pterodactyl.apikeyclient,
                                    'Content-Type': 'application/json',
                                    'Accept': 'Application/vnd.pterodactyl.v1+json',
                                }
                            }).then(response => {
                                const node = response.data.attributes.node;
                                console.log(node)
                                const port = response.data.attributes.relationships.allocations.data[0].attributes.port
                                if (node === "Node 1") {

                                    //Change Server IP
                                    setTimeout(() => {
                                        var y = 0;
                                        while (y < 3) {
                                            const ipchange = rif.sync({
                                                files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                                from: "REPLACE-IP",
                                                to: "154.27.68.232",
                                                countMatches: true,
                                            });
                                            y++
                                        };

                                        //Change Server Port
                                        setTimeout(() => {
                                            var x = 0;
                                            while (x < 3) {
                                                const portchange = rif.sync({
                                                    files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                                    from: "REPLACE-PORT",
                                                    to: port,
                                                    countMatches: true,
                                                });
                                                x++
                                            }
                                        }, 100) //END - Change Server Port
                                    }, 100) //END - Change Server IP
                                } else if (node === "Node 2") {

                                    //Change Server IP
                                    setTimeout(() => {
                                        var y = 0;
                                        while (y < 3) {
                                            const ipchange = rif.sync({
                                                files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                                from: "REPLACE-IP",
                                                to: "154.27.68.233",
                                                countMatches: true,
                                            });
                                            y++
                                        };

                                        //Change Server Port
                                        setTimeout(() => {
                                            var x = 0;
                                            while (x < 3) {
                                                const portchange = rif.sync({
                                                    files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                                    from: "REPLACE-PORT",
                                                    to: port,
                                                    countMatches: true,
                                                });
                                                x++
                                            }
                                        }, 100) //END - Change Server Port
                                    }, 100) //END - Change Server IP
                                } else if (node === "Node 5") {

                                    //Change Server IP
                                    setTimeout(() => {
                                        var y = 0;
                                        while (y < 3) {
                                            const ipchange = rif.sync({
                                                files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                                from: "REPLACE-IP",
                                                to: "154.27.68.244",
                                                countMatches: true,
                                            });
                                            y++
                                        };

                                        //Change Server Port
                                        setTimeout(() => {
                                            var x = 0;
                                            while (x < 3) {
                                                const portchange = rif.sync({
                                                    files: '/root/DBH/Panel/proxy/' + args[1] + '.conf',
                                                    from: "REPLACE-PORT",
                                                    to: port,
                                                    countMatches: true,
                                                });
                                                x++
                                            }
                                        }, 100) //END - Change Server Port
                                    }, 100) //END - Change Server IP
                                } else {
                                    message.channel.send('Unsupported node. Stopping reverse proxy.')
                                    fs.unlinkSync("./proxy/" + args[1] + ".conf");
                                }


                                //Upload file to /etc/apache2/sites-available
                                setTimeout(() => {
                                    ssh.putFile('/root/DBH/Panel/proxy/' + args[1] + '.conf', '/etc/apache2/sites-available/' + args[1] + ".conf").then(function () {

                                        //Run command to genate SSL cert.
                                        ssh.execCommand(`certbot certonly -d ${args[1]} --non-interactive --webroot --webroot-path /var/www/html --agree-tos -m danielpd93@gmail.com`, {
                                            cwd: '/root'
                                        }).then(function (result) {
                                            if (result.stdout.includes('Congratulations!')) {
                                                //No error. Continue to enable site on apache2 then restart
                                                console.log('SSL Gen complete. Continue!')

                                                ssh.execCommand(`a2ensite ${args[1]} && service apache2 restart`, {
                                                    cwd: '/root'
                                                }).then(function (result) {
                                                    //Complete
                                                    message.reply('Domain has now been linked!')

                                                    /*
                                                    domains.set(args[1], {
                                                        DiscordID: message.author.id,
                                                        ServerID: args[2],
                                                        Domain: args[1]
                                                      });
                                                    */
                                                })
                                            } else if (result.stdout.includes('Certificate not yet due for renewal')) {
                                                //No error. Continue to enable site on apache2 then restart
                                                console.log('SSL Gen complete. Continue!')

                                                ssh.execCommand(`a2ensite ${args[1]} && service apache2 restart`, {
                                                    cwd: '/root'
                                                }).then(function (result) {
                                                    //Complete
                                                    message.reply('Domain has now been linked!')

                                                    /*
                                                    domains.set(args[1], {
                                                        DiscordID: message.author.id,
                                                        ServerID: args[2],
                                                        Domain: args[1]
                                                      });
                                                    */
                                                })
                                            } else {
                                                message.channel.send('Error making SSL cert. Either the domain is not pointing to `154.27.68.234` or cloudflare proxy is enabled!\n\n' +
                                                    '**If you have just done this after running the command. Please give the bot 5 - 10mins to refresh the DNS cache** \n\nFull Error: ```' + result.stdout + '```')
                                                fs.unlinkSync("./proxy/" + args[1] + ".conf");
                                            }
                                        })
                                    }, function (error) {
                                        //If error exists. Error and delete proxy file
                                        fs.unlinkSync("./proxy/" + args[1] + ".conf");
                                        message.channel.send("FAILED \n" + error);
                                    })
                                }, 250) //END - Upload file to /etc/apache2/sites-available
                            }).catch(err => {
                                message.channel.send('Can\'t find that server :( ')
                                fs.unlinkSync("./proxy/" + args[1] + ".conf");
                            }) //END - Grab server info (Node and Port)
                        }, 250) //END - //Change Domain
                    }
                })
            }
        }
    } else if (args[0].toLowerCase() == "unproxy") {
        if (!args[1]) {
            const embed = new Discord.RichEmbed()
                .setTitle('__**How to remove a domain from a server**__ \nCommand format: ' + config.DiscordBot.Prefix + 'server unproxy domainhere')
            message.channel.send(embed)
        } else {

            //SSH Connection
            ssh.connect({
                host: config.SSH.Host,
                username: config.SSH.User,
                port: config.SSH.Port,
                password: config.SSH.Password,
                tryKeyboard: true,
            })

            //Delete file from apache2 dir
            ssh.execCommand('a2dissite ' + args[1] + ' && rm /etc/apache2/sites-available/' + args[1] + '.conf && rm -rf /etc/letsencrypt/live/' + args[1] + ' && rm -rf /etc/letsencrypt/archive' + args[1] + '&& service apache2 restart', {
                cwd: '/root'
            })
            fs.unlinkSync("./proxy/" + args[1] + ".conf");
            message.channel.send('Proxy has been removed from ' + args[1])
        }

    }
};