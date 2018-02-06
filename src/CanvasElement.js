const { EventEmitter } = require('events');


/**
 * Represents a target that can be rendered to the screen.
 * This includes a prompt, text, text input prompt, etc...
 * Notes: this.renderBuffer[0] will always be the first arg in first function.
 */
class CanvasElement
{   
    constructor(canvas)
    {
        this.canvas = canvas;
        this.bindMethods.bind(this)();
        this.eventHandler = new EventEmitter();
        // all lines this will render.
        this.renderBuffer = [];
        this.writeSchema = undefined;
        this.canvas.registerElement(this);
    }

    /**
     * This is a lazy fix since i wanted to change to a schema based approch but was too lazy to rewrite the renderer
     */
    get prompt()
    {
        return this.writeSchema;
    }

    /**
     * Bind all local methods.
     */
    bindMethods()
    {
        this.render = this.render.bind(this);
        this.renderPromiseSchema = this.renderPromiseSchema.bind(this);
        this.simpleRender = this.simpleRender.bind(this);
    }


    /**
     * Render the 0 index of renderBuffer. this is basic rendering
     */
    simpleRender(properties)
    {
        return new Promise(resolve => {
            this.canvas.renderer.renderLine(this.renderBuffer[0], properties);
            this.canvas.renderer.newLine();
            resolve();
        });
    }

    /**
     * This will invoke a schema render proccess with the schema.promise propertiy and continue rendering when said promise resolves.
     * @param {*} properties 
     */
    renderPromiseSchema(properties)
    {
        const { renderer } = this.canvas;
        return new Promise(resolve => {
            renderer.renderSchema(this, properties).then(() => {
                renderer.newLine();
                resolve();
            });
        });
    }

    /**
     * Render this item.
     */
    async render(...properties)
    {
        // properties = this.canvas.compileProperties(properties);
        
        const renderer = this.canvas.renderer;
        if(!this.writeSchema) // simple line render
            return await this.simpleRender(properties);
        else if(this.writeSchema)
            return await this.renderPromiseSchema(properties);
        
    }

}

module.exports = CanvasElement;