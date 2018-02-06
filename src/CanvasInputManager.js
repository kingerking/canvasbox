const _ = require('lodash');

/**
 * A Canvas input manager.
 * Built for use to control realtime model updates and reflect to prompts.
 * @param {*} canvas 
 */
module.exports = canvas => {
    return {
        /**
         * Collect a key event.
         */
        collectKey: () => new Promise(resolve => {
            canvas.eventHandler.on('key', (str, key) => resolve(key));
        }), 
    };
};