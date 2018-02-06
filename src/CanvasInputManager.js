const _ = require('lodash');

/**
 * A Canvas input manager.
 * Built for use to control realtime model updates and reflect to prompts.
 * @param {*} canvas 
 */
module.exports = canvas => {
    return (...userCallbacks) => {
        return new Promise(resolve => {
            // pass resolve into the doReturn fields.
            const callbacks = canvas.compileProperties(userCallbacks);        
            
            canvas.eventHandler.once('key', (str, key) => {
                if(callbacks['key'])
                    callbacks['key'](key, resolve);
            });
        });
    };
};