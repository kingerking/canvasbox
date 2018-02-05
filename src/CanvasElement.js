const { EventEmitter } = require('events');


/**
 * Represents a target that can be rendered to the screen.
 * This includes a prompt, text, text input prompt, etc...
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
    }

    /**
     * Render this item.
     */
    render()
    {
        const renderer = this.canvas.renderer;
        this.renderBuffer.forEach(line => renderer.renderLine(line));
    }

}

module.exports = CanvasElement;