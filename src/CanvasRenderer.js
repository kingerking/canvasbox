const { EventEmitter } = require('events');

const readline = require('readline');
const chalk = require('chalk');
const CanvasInputManager = require('./CanvasInputManager');
const cliCursor = require('cli-cursor');

/**
 * Will handle all rendering to screen.
 * 
 * This renderer renders top-bottom then clears bottom-top. working only off the amount of lines rendered. therefore no need for a bunch of fancy readline calls.
 */
class CanvasRenderer
{
    constructor(canvas)
    {
        this.bindMethods.bind(this)();
        this.canvas = canvas;
        this.lineCount = 0;
        this.firstRender = true;
    }

    bindMethods()
    {
        this.clearLines = this.clearLines.bind(this);
        this.renderLine = this.renderLine.bind(this);
        this.renderSchema = this.renderSchema.bind(this);
        this.newLine = this.newLine.bind(this);
        this.write = this.write.bind(this);
    }

    
    /**
     * Will clear bottom to top of all current lines.
     * Then user can draw since cursor will be at the top of screen.
     */
    clearLines()
    {
        if(this.firstRender)
        { this.firstRender = false; return; }
        readline.moveCursor(process.stdout, 0, -(this.lineCount));
        readline.clearScreenDown(process.stdout);
        this.lineCount = 0;
    }

    /**
     * Simply write a buffer to the screen
     * @param {*} data buffer to write.
     */
    write(data)
    { process.stdout.write(data) }

    /**
     * This Will create a new line to write.
     */
    newLine()
    {
        process.stdout.write('\n');
        readline.cursorTo(process.stdout, 0);
        this.lineCount++;
    }
    
    /**
     * This will render a line to the screen.
     * @param {*} lineData The data to render
     * @param {*} properties Any extra CanvasProperty()'s. (may include data for rendering prompts)
     */
    renderLine(lineData, ...properties)
    {
        this.write(lineData);
    }

    /**
     * Will Render a schema and continue rendering after its .promise is resolved. the new line will be appended upon .resolve.
     * @param {*} element The element containing the schema to render
     * @param {*} properties render properties
     */
    renderSchema(element, ...properties)
    {
        return new Promise(resolve => {
            const props = this.canvas.compileProperties(properties);
            this.renderLine(element.writeSchema.name);

            // remember resolve when to render next.
            resolve();
        });
    }
    
}

module.exports = CanvasRenderer;