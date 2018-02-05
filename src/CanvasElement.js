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
        this.canvas.registerElement(this);
    }
    /**
     * Bind all local methods.
     */
    bindMethods()
    {
        this.render = this.render.bind(this);
        // this.constructPrompt = this.constructPrompt.bind(this);
        this.textPromptRender = this.textPromptRender.bind(this);
        this.simpleRender = this.simpleRender.bind(this);
        this.renderLines = this.renderLines.bind(this);
    }

    /**
     * If this controls a text prompt then render it.
     */
    textPromptRender(properties)
    {
        return new Promise(resolve => {
            this.canvas.renderer.renderLine("Prompt Render!", 
            ...properties    
            ).then(resolve);
        });
    }

    /**
     * Render the 0 index of renderBuffer. this is basic rendering
     */
    simpleRender(properties)
    {
        return new Promise(resolve => {
            this.canvas.renderer.renderLine(this.renderBuffer[0], properties).then(resolve);
        });
    }

    /**
     * Render every line in the render buffer.
     */
    async renderLines(properties)
    {
        for(const line in this.renderBuffer)
            await this.canvas.renderer.renderLine(line, properties);
        // process.stdout.write('\n');
        return;
    }

    /**
     * Render this item.
     */
    async render(...properties)
    {
        properties = this.canvas.compileProperties(properties);
        const renderer = this.canvas.renderer;
        if(!this.prompt)
            return await this.simpleRender(properties);
        else
            return await this.textPromptRender(properties);
    }

}

module.exports = CanvasElement;