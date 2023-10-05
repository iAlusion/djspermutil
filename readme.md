[DEPRECATED] This package is no longer maintained. Possible revamp in the near future.

#Intro

Its finally here, its complete release. djspermutil enables the bot developer to get a more custom touch in permitting certain things. 

For any troubleshooting DM me on discord `iAlusion` or email me on `iAlusion.projects@gmail.com`

All usage is explained below in categories.

#Command Handling
These functions are desired for the command handling, but not limited to.

* prompt
    Prompt is used to get an argument from the command caller manually. It will send your question and return the answer given if there was one supplied. It requires a message and a string containing  the question to be asked. The message has to be from the one who has to answer it.

```js
    const answer = await client.util.prompt(message, question);
        if(answer === 'something') {
            // do something with it
        }

        //or for e.g passing it as an argument
            someFunction(answer);
```

* shouldRun
    shouldRun is used for command handling. This function could be added anywhere that you would like to prevent from running if certain permissions are not met. It requires options and a member.

```js
    const props = {
        enabled: true, //Optional, by default true.
        ownerOnly: false, //Optional by default false.
        blockedCheck: true, //Optional by default true.
        //Either guildPermissions or globalLevel is required for the handling.
        guildPermissions: ['SEND_MESSAGES'],
        globalLevel: 0
    }

    if(!client.util.shouldRun(props, member)) return;
```

* customRun
    customRun is a function that allows you to code your own check. This allows you to use the permissions or anything else you desire, to prevent a command from running, events from being fired, etc, etc. Ensure that the callback always returns a boolean.

```js
    // Still uses same props like shouldRun
        if(!client.util.customRun(props => {
            if() return false; //some statement
        }));
```

#Custom Permissions
Custom Permissions are used just the way regular permissions are. They give or deny access to e.g commands. It is up to yourself for what you use it for. It can be used infront of anything to prevent it from running further lines of code with the Command Handling functions.

* createCustom
    Creates a Custom Permission. Used for both preset loading as creating new ones.

```js
    createCustom(name, id, globalLevel = 1, members = [])
```

* resolveCustom
    Custom Permissions resolver. This function works by defining which key to compare to what value.
       key - Existing key in the Custom Permission excluding; 
```js
    resolveCustom(key, value, all)
```

* deleteCustom

```js
    deleteCustom(customPerm)
```

* getCustom

```js
    getCustom(id)
```

* editCustom

```js
    editCustom(name, key, val)
```

* updateMembers

```js
    updateMembers(user, name, option)
```

* isMember

```js
    isMember(id, user)
```

#User/Member Permissions

* getRoles

```js
    getRoles(guild, filter, values)
```

* getMemberPermissions
    Gets the standard permissions a member has in a guild. SEND_MESSAGES, VIEW_MESSAGES, etc...
        Optionally you can add to check for channel overwrites.

```js
        const permission = client.util.getMemberPermissions(member)
```

* getUserCustoms
    Gets the Custom Permissions a user is in, optionally could be filtered.

```js
        // Option one: Getting all Custom Permissons that the user is a member of.
            const customs = client.util.getUserCustoms(user)
        
        // Option two: Filter a users custom permissions.
            const filter = custom => custom.globalLevel >= 1;
            const customs = client.util.getUserCustoms(user, filter);
```

* getUserRegistry
    A promise resolving function that gets the full registry on a user. This includes per shared guild permissions, as custom permissions.

```js

    exports.run = async () => {
        const registry = await client.util.getUserRegistry(client, user);
            if(!registry.customs.has('someCustomID')) return;
    }
```

#Install

Simply install it by `npm install djspermutil`

Wherever in your Discord bot you may need it:

Dont think too hard! Attach it to your client on your main file.

```js
const djspermutil = require('djspermutil');

client.permUtil = new djspermutil(pathToDataFolder, settingsFilePath);

//Now you should be able to use it anywhere where you have your client!
```