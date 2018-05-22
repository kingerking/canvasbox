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
        collectKey: callback => new Promise(resolve => {
            let doReset = true;
            const setupListener = () => {
                canvas.eventHandler.once('key', (str, key) => {
                    if(callback)
                    {
                        callback({str, key, stopListening: () => doReset = false});
                        if(!doReset) return;
                        setupListener();
                    }
                });
            };
            setupListener();
            
        }), 
    };
};