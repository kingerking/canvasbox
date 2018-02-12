const {EventEmitter} = require('events');
const _ = require('lodash');

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
        this.eventHandler = new EventEmitter();
        this.bindMethods.bind(this)();
        // all lines this will render.
        // length of this is considered the height of the element
        this.renderBuffer = [];
        this.writeSchema = undefined;
        // key of model value this is linked to. to basically we will re-render this element if the value is different from currently rendered element.
        this.linkedTo = undefined;
        this.queued = false;
        this.lineNumber = 0;
        
    }
    /**
     * Bind all local methods.
     */
    bindMethods()
    {
        this.render = this.render.bind(this);
        this.renderPromiseSchema = this.renderPromiseSchema.bind(this);
        this.simpleRender = this.simpleRender.bind(this);
        this.discard = this.discard.bind(this);
        this.inactiveSchemaRender = this.inactiveSchemaRender.bind(this);
        this.event = this.event.bind(this);
        this.queueForRender = this.queueForRender.bind(this);
    }

    queueForRender()
    {
        this.queued = true;
        // the line number this element resides on
        this.lineNumber = this.canvas.elements.length;
        this.canvas.registerElement(this);
    }

    /**
     * This is a lazy fix since i wanted to change to a schema based approch but was too lazy to rewrite the renderer
     */
    get prompt()
    {
        return this.writeSchema;
    }

    set value(newValue)
    {
        
    }

    get value()
    {

    }

    event(name)
    {
        return callback => {
            this.eventHandler.once(name, event => {
                if(event && event.target && event.target == this)
                    callback(event);
            });
            return this;
        }
    }


    
    discard()
    {
        this.queued = false;
        this.lineNumber = undefined;
        this.canvas.elements.splice(this.canvas.elements.indexOf(this), 1);
    }
    
    /**
     * Render the 0 index of renderBuffer. this is basic rendering
     */
    simpleRender(properties)
    {
        return new Promise(resolve => {
            for(let i = 0; i < this.renderBuffer.length; i++)
                this.canvas.renderer.renderLine(this.renderBuffer[i], this.lineNumber + i, properties);
            
            resolve();
        });
    }

    inactiveSchemaRender(properties)
    {
        return new Promise(resolve => {
            // this.canvas.renderer.renderLine(this.renderBuffer[0] + this.canvas.builder.value(this.writeSchema.name), this.lineNumber, properties);
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
            renderer.renderSchema(this, this.lineNumber, properties).then(resolve);
        });
    }

    /**
     * Render this item.
     */
    async render(...properties)
    {
        const renderer = this.canvas.renderer;

        if(!this.writeSchema) // simple line render
            return await this.simpleRender(properties);
        else if(this.writeSchema)
        {
            if(this.writeSchema.dropped)
                return await this.inactiveSchemaRender(properties);
            return await this.renderPromiseSchema(properties);
        }
        
        
    }

}

module.exports = CanvasElement;