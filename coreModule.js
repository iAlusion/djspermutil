const DataModule = require('./dataModule'), fs = require('fs'), EventEmitter = require('events');

class PermissionsModule extends EventEmitter {
    constructor(dataPath, settingsPath) {
        super();
        if(!dataPath || !settingsPath) throw new Error('Cannot instantiate the Utility without a Data directory path and an Owner User ID');
        if(!fs.lstatSync(dataPath).isDirectory()) throw new Error('Path to Data directory is invalid');
        if(!fs.lstatSync(settingsPath).isFile()) throw new Error('Path to Settings file is invalid');
        const setFile = require(settingsPath);

        Object.defineProperties(this, {
            dataModule: {
                value: new DataModule(dataPath),
                writable: false
            },
            customPerms: {
                value: new Map(),
                writable: false
            },
            commandsSet: {
                value: new Map(),
                writable: false
            },
            settings: {
                value: {
                    ownerID: setFile.ownerID || null,
                    enabledEvents: setFile.enabledEvents || [],
                    shouldEmit: setFile.shouldEmit || false,
                    blocked: setFile.blocked || []
                },
                writable: false
            },
            discordPerms: {
                value: [
                    'CREATE_INSTANT_INVITE', 'KICK_MEMBERS', 'BAN_MEMBERS', 'ADMINISTRATOR', 
                    'MANAGE_CHANNELS', 'MANAGE_GUILD', 'ADD_REACTIONS', 'VIEW_AUDIT_LOG', 
                    'PRIORITY_SPEAKER', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES',
                    'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'MENTION_EVERYONE',
                    'USE_EXTERNAL_EMOJIS', 'CONNECT', ' SPEAK','MUTE_MEMBERS', 'MANAGE_MESSAGES',
                    'DEAFEN_MEMBERS', 'MOVE_MEMBERS', 'USE_VAD', 'CHANGE_NICKNAME',
                    'MANAGE_NICKNAMES', 'MANAGE_ROLES', 'MANAGE_WEBHOOKS', 'MANAGE_EMOJIS'
                ],
                writable: false
            }
        })

        const dataDirectory = fs.readdirSync(dataPath);
            for(const file of dataDirectory) {
                const custom = require(`${dataPath}/${file}`);
                this.createCustom(custom.name, custom.id, custom.globalLevel, custom.members, false);
            }
    }

    /**
     * Gets a map of roles by option and value on a guild.
     * @param {Guild} guild - Requires a valid Guild.
     * @param {string} key - Requires a valid key to check.
     * @param {array} values - Requires a valid array with the values matching the filter to pass.
     * @returns {map} - <Mapped roles by id>
     */

    getRoles(guild, key, values) {
        const roles = [...guild.roles.values()].filter(role => { 
            if(key == 'permissions') return values.some(v => role.permissions.has(v));
                if(key == 'members') return values.some(v => role.members.has(v));
                    return values.includes(role[key]) 
        });
            this.handleEmit('data', { func: 'getRoles', args: { guild, key, values } } );
                return roles;
    }

    /**
     * Gets the permissions the user has in a guild.
     * @param {GuildMember} member - Requires a valid GuildMember object.
     * @returns {array} - Array of available permissions.
     */

    getMemberPermissions(member) {
        const guildPermissions = member.permissions.toArray(false);
            this.handleEmit('data', { func: 'getGuildPermissions', args: { member }, guildPermissions});
        return guildPermissions.length > 0 ? guildPermissions : 'No permissions for this user.';
    }

    /**
     * Gets the Custom Permissions the user is a member of.
     * @param {User} user - Requires a valid User object.
     * @param {Function} filter - A filter to pass e.g 'custom => custom.globalLevel >= 1'
     * @returns {Array} - Custom Permissions available.
     */

    getUserCustoms(user, filter) {
        let customs = [...this.customPerms.values()].filter(c => c.members.includes(user.id));
            if(filter) customs = customs.filter(filter);
        const customsMap = new Map();
            customs.forEach(custom => customsMap.set(custom.id, custom))
        return customsMap;
    }
     
    /**
     * Gets all guilds shared by bot and user, user's permissions. As Custom Permissions.
     * @param {Client} client - Requires a valid Client object.
     * @param {User} user - Requires a valid User object.
     * @returns {Object} - Returns the registry.
     */

    async getUserRegistry(client, user) {
        const guildsMap = client.guilds.map(async guild => {
            const member = await guild.fetchMember(user.id);
                if(!member) return;
            const guildVal = await this.getGuildStandards(member);
            return {
                key: guild.id,
                val: guildVal
            }
        })
        const registry = {
            guilds: await Promise.all(guildsMap),
            customs: await this.getUserCustoms(user)
        }
        this.handleEmit('data', { func: 'getUserRegistry', user, registry } );
        return registry;
    }

    /**
     * Creates a Custom Permission.
     * @param {String} name - <REQUIRED> A name for the Custom Permission.
     * @param {String} id - <REQUIRED> An ID for the Custom Permission.
     * @param {Number} globalLevel - A level to use in the permissions module to give access to stuff. If none provided, the standard level 1 will be set.
     * @param {Array} members - An array of user ID's that should be allowed on this Custom Permission.
     * @param {Boolean} newPerm - Whether its a new custom permission or not. By default true.
     * @returns {Object} Custom Permission.
     */

    async createCustom(name, id, globalLevel = 1, members = [], newPerm = true) {
        const data = { name: name, id: id, globalLevel: globalLevel, members: members };
            this.dataModule.validateCustom(data);
            this.customPerms.set(id, data);
                if(newPerm) await this.dataModule.writeFile(data);
                    this.handleEmit('customs', { func: 'createCustom', data, saved: newPerm });
        return this.customPerms.get(id);
    }

    /**
     * Gets a Custom Permission.
     * @param {?Any} key - The key to match.
     * @param {?Any} value - The value that should match the key.
     * @param {Boolean} all - Whether all matches should be returned or the first one.
     * @returns {CustomPerm} - A Custom Permission. Null if none matched.
     */

    resolveCustom(key, value, all = false) {
        let cID = this.customPerms.get(value);
        let cKEY = [...this.customPerms.values()].filter(custom => custom[key] == value).map(custom =>  { return { key: custom.id, value: custom }})
            this.handleEmit('customs', { func: 'resolveCustom', key, value } );
        if(cID) return cID;
            if(!all) return cKEY[0];
                return cKEY;
    }

    /**
     * Deletes a Custom Permission completely.
     * @param {CustomPerm} customPerm - Custom Permission to delete.
     */

    async deleteCustom(customPerm) {
        await this.dataModule.deleteJSONFile(customPerm);
        this.customPerms.delete(customPerm.id);
        this.emit('customs', { func: 'deleteCustom', customPerm });
        return true;
    }

    /**
     * Prompts a question to a user to answer.
     * @param {Message} msg - A valid message object.
     * @param {String} question - A question to ask the user to answer.
     * @returns {Answer/Null} - If answered returns the answer, else null.
     */

    async prompt(msg, question) {
		await msg.channel.send(question);
			const filter = m => m.author.id === msg.author.id;
			const messages = await msg.channel.awaitMessages(filter, { max: 1, time: 20000, errors: ['time'] });
				if(messages.first().content) return messages.first().content;
					return null;
    }

    /**
     * Checks to run a command or not.
     * @param {Object} props - Command settings.
     * @param {GuildMember} member - Member object.
     */

    shouldRun(props, member) {
        if(!props.enabled) return false;
        else if(props.ownerOnly && member.user.id === this.settings.ownerID) return true;
        else if(props.blockedCheck && this.settings.blocked.includes(member.user.id)) return false;

            else if(props.guildPermissions) {
                const guildPerms = this.getGuildPermissions(member);
                if(guildPerms.some(perm => props.guildPermissions.includes(perm))) return true;
            }
            else if(props.globalLevel) {
                const customs = this.getCustomPermissions(member.user, { key: 'globalLevel', value: props.globalLevel });
                return customs;
            }
    }

    /**
     * Ables to customize your own way of allowing or denying access to users.
     * @param {Object} args - The arguments to work with. Object form; { user: <someuser>, custom: custom.get(), etc }
     * @param {Function} toRun - Your function that cooperates with your arguments, these can be anything including the custom permissions.
     * @returns {Boolean}
     * @example
     *  client.core.customRun({ user: msg.author }, args => {
     *      if(args.user.id === client.permUtil.settings.ownerID) return true;
     *          return false;
     *  })
     */

    async customRun(args, toRun) {
        if(typeof args !== 'object') throw new Error('args require to be an object.');
            const res = await toRun(args);
                if(typeof res !== 'boolean') throw new Error('the customRun function requires to return a boolean.');
        return res;
    }

    /**
     * Gets a Custom Permission for use wherever.
     * @param {String} id - An existing ID.
     */

    getCustom(id) {
        return this.customPerms.get(id);
    }

    /**
     * Edits a Custom Permission key with provided value.
     * @param {String} id - Identifier of the Custom Permission
     * @param {String} key - Valid existing key of the Custom Permission
     * @param {?Any} val - Could be an overwrite of the members, name, or globalLevel
     */

    async editCustom(id, key, val) {
        const custom = this.customPerms.get(id);
        if(key === 'id') throw new Error('ID cannot be edited due to saving matters.');
        if(!custom[key]) throw new Error('Specified key does not exist in the Custom Permission');
            custom[key] = val;
        return this.dataModule.writeFile(custom);
    }

    /**
     * Adds or removes a member on a Custom Permission
     * @param {User} user - A valid user
     * @param {String} name - An existing Custom Permission name
     * @param {Boolean} option - If option is provided and true, it will add the provided user, in every other case it will be removed.
     */

    async member(user, name, option) {
        const custom = await this.resolveCustom('name', name);
            if(option) custom.members.push(user.id);
            else if(!option) {
                const newArr = await this.dataModule.indexHandle(custom.members, user.id);
                custom.members = newArr;
            }
        return this.dataModule.writeFile(custom);
    }

    /**
     * Checks whether a user is member from the provided Custom Permission by ID
     * @param {String} id - Valid identifier for a custom Permission
     * @param {User} user - Valid user
     */

    isMember(id, user) {
        return this.customPerms.get(id).members.includes(user.id);
    }

    /**
     * CURRENTLY DISABLED.
     * Handles events for the module, automatically.
     * @param {String} event - Valid event that is enabled
     * @param {*} data - Valid data to pass with the emit
     */

    handleEmit(event, data) {
        return null;
        if(!this.settings.shouldEmit) return;
        else if(!this.settings.enabledEvents.includes(event)) return;
        else this.emit(event, ...Object.values(data));
    }
}

module.exports = PermissionsModule;