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
        collectKey: enableEngine => new Promise(resolve => {
            const setupListener = () => {
                canvas.eventHandler.once('key', (str, key) => {
                    if(enableEngine)
                        resolve({str, key});
                    else if(key.name == 'return') // when disabling the engine we will only
                        resolve({str, key});
                    else
                        setupListener();
                });
            };
            setupListener();
            
        }), 
    };
};