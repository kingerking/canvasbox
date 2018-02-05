const _ = require('lodash');
const CanvasElement = require('./CanvasElement');

/**
 * This is what is passed into a users CanvasFactory function(Their render function).
 * This will contain inerfacing methods for users use.
 */
class CanvasBuilder {
    constructor(canvas)
    {
        this.bindMethods.bind(this)();
        this.canvas = canvas;

    }

    bindMethods()
    {
        this.clear = this.clear.bind(this);
        this.prompt = this.prompt.bind(this);
        this.write = this.write.bind(this);
        this.model = this.model.bind(this);
        this.forceRender = this.forceRender.bind(this);
    }

    /**
     * Create CanvasElement, 
     * add it to the render queue,
     * then return to user
     * @param {*} data 
     * @param {*} options 
     */
    write(data = "", ...options)
    {
        const element = new CanvasElement(this.canvas);
        element.renderBuffer.push(data);
        element.options = options;
        // if your rendering a prompt then pass the prompt schema into this.
        return schema => {
            element.prompt = schema;
        };
    }

    /**
     * Return a basic key value pair.
     * @param {*} key 
     * @param {*} value 
     */
    

    /**
     * Will clear all previous output.
     */
    clear()
    {
        this.canvas.renderer.clearLines();
    }

    /**
     * Will create a prompt schema
     * @param {*} bindTo What model key to bind to.
     */
    prompt(bindTo = "")
    {
        const promptSchema = {};
        promptSchema.name = bindTo;

        return (...properties) => {
            // define object to merge.
            promptSchema.options = this.canvas.compileProperties(properties);    
            return promptSchema;
        };
    }

    /**
     * Used to set and get data from the model.
     * @param {*} required 
     */
    model(...required)
    {
        // if user passes nothing then return the current state of model.
        if(required.length == 0)
            return this.canvas.model;

        // invoke user factory when the model contains the required values.
        return (factory, fallback) => {
            // User is setting the model to the value of factory.
            if(required.length == 1 && !factory && !fallback && !(factory instanceof Function))
            {
                // pull value off the model
                const value = this.canvas.model[required[0]];
                return value ? value : "";
            }
            else if(required.length == 1 && factory && !(factory instanceof Function))
                // update the value and return.
                return this.canvas.updateModelValue(this.canvas.property(required[0], factory));
            
            // user wants to invoke a factory function if all values exist.
            const returnBuffer = {};
            // iterate through the required values.
            required.forEach(key => {
                // check if model contains keys.
                if(this.canvas.model[key])
                    returnBuffer[key] = this.canvas.model[key];
                
            });
            // if the return buffer size is equal to the required value size(meaning found all values) then run the user factory with the returnBuffer.
            if(_.size(returnBuffer) == required.length)
            {
                if(factory) factory(returnBuffer);
                return returnBuffer;
            } // if not all required values are present the render a fallback.
            else {
                if(fallback) fallback();
                return returnBuffer;
            }
        };  
    }
    forceRender()
    {
        this.canvas.eventHandler.emit('render');
    }

}
module.exports = CanvasBuilder;