const fs = require('fs');

class DataModule {
    constructor(dataPath) {

        this.dataPath = dataPath;

        this.customNames = [];

        this.customIds = [];

    }

    /**
     * Handles single items for arrays.
     * @param {Array} on - Array to add/remove item on.
     * @param {String} value - Item to add/remove.
     * @returns {newArray} - The Array for the item.
     */

    indexHandle(on, value) {
        return new Promise((resolve, reject) => {
            if(!Array.isArray(on)) reject('indexHandle function requires an array.');
            for(var i = 0; i < on.length; i++){  
                if(on[i] === value) on.splice(i, 1); 
            }
            resolve(on);
        })
    }

    /**
     * Data validation to ensure proper Custom Permissions.
     * @param {Object} data - Data to be validated.
     */

    validateCustom(data) {
        if(typeof data !== 'object') throw new Error('Function validateData requires an Object');

            if(!data.name || typeof data.name !== 'string' || this.customNames.includes(data.name)) throw new Error('Name param is required, must be a string, and not already be in use');
            else if(!data.id || typeof data.id !== 'string' || this.customIds.includes(data.id)) throw new Error('id param is required, must be a string, and not already be in use');
            else if(!data.globalLevel || isNaN(data.globalLevel) || data.globalLevel > 10) throw new Error('globalLevel param is required, and must be a number not higher than 10');
            else if(data.members && !Array.isArray(data.members)) throw new Error('When providing member param, it must be an array.');

        return true;
    }

    /**
     * Data validation to ensure proper Command Permissions.
     * @param {Object} data - Data to be validated.
     */

    validateCommand(data) {
        if(typeof data !== 'object') throw new Error('Function validateCommand requires an Object');
        
            if(data.enabled && typeof data.enabled !== 'boolean') throw new Error('Whenever providing enabled option it must be a boolean');
            else if(data.ownerOnly && typeof data.ownerOnly !== 'boolean') throw new Error('When providing the ownerOnly option, it must be a boolean');
            //else if(data.customAccess && !Array.isArray(data.customAccess)) throw new Error('When providing the customAccess option, it must be an array.');
            else if(data.guildPermissions && !Array.isArray(data.guildPermissions)) throw new Error('When providing the guildPermissions option, it must be an array.');
            else if(!data.globalLevel && !data.guildPermissions || isNaN(data.globalLevel) || data.globalLevel > 10) throw new Error('globalLevel option is required, and must be a number not higher than 10');
            else if(data.blockedCheck && typeof data.blockedCheck !== 'boolean') throw new Error('When providing the blockedCheck option, it must be a boolean');
        
        return true;
    }

    /**
     * Reads a file in the stored Data path provided with the file name.
     * @param {fileID} id - File name to read.
     * @returns {Promise} - Returns a promise to act on resolve/reject.
     */

    readFile(id) {
        return new Promise((resolve, reject) => {
            fs.readFile(`${this.dataPath}/${id}.json`, 'utf8', (err, curData) => {
                if (err) { reject(err); } else { resolve(JSON.parse(curData)); }
            });
        });
    }

    /**
     * Writes data to a json file. Stringify's it, as adds a clean-look to the JSON file.
     * @param {String} name - File name to write to.
     * @param {Object} data - Data to write.
     * @returns {Promise} - Returns a promise to act on failure.
     */

    writeFile(data) {
        return new Promise((resolve, reject) => {
            console.log(data);
            fs.writeFile(`${this.dataPath}/${data.id}.json`, JSON.stringify(data, null, 2), (err) => {
                if(err) reject(err);
                else resolve('Stored.')
            });
        });
    }

    /**
     * Updates the members of a Custom Permission.
     * @param {customPermissionInstance} customPerm - The required instance of an Custom Permission.
     * @param {string} option - Instructs the function to either add or remove members. Only 'add' or 'remove' are valid input.
     * @param {array} id - An ID to add or remove.
     */

    async updateMembers(customPerm, option, id) {
        let currentData = await this.readFile(customPerm.id);
            await this.indexHandle(customPerm.members, option, id);
            await this.writeFile(customPerm)
        return null;
    }

    /**
     * Deletes the data of an Custom Permission.
     * @param {CustomPerm} customPerm - Requires a valid CustomPerm instance to delete.
     */

    deleteJSONFile(customPerm) {
        return new Promise((resolve, reject) => {
            if(!fs.lstatSync(`${this.dataPath}/${customPerm.id}.json`).isFile()) reject('File does not exist with current path');
            fs.unlink(`${this.dataPath}/${customPerm.id}.json`, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }
}

module.exports = DataModule;