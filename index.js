const Canvas = require('./src/Canvas');

/**
 * Creates a new Canvas.
 * Please note:
 *  Only create one canvas at a time especially if you are grabbing user input.
 * @param {*} factory The user factory object(The render method).
 * @param {*} options Any options you wish to pass.
 */
module.exports = (factory, ...options) => {
    if(factory instanceof Function)
        return (new Canvas(factory, options)).builder;
};
