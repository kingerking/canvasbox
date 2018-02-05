const { EventEmitter } = require('events');

const readline = require('readline');
const chalk = require('chalk');

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
    }

    bindMethods()
    {
        this.clearLines = this.clearLines.bind(this);
        this.renderLine = this.renderLine.bind(this);
        this.input = this.input.bind(this);
    }

    
    /**
     * Will clear bottom to top of all current lines.
     * Then user can draw since cursor will be at the top of screen.
     */
    clearLines()
    {
        const lineCount = this.lineCount;
        // console.log(chalk.red("lines to clear"), lineCount);
        for(let i = lineCount - 1; i >= 0; i--)
        {
            readline.clearLine(process.stdout);
            readline.moveCursor(process.stdout, 0, -1);
            readline.cursorTo(process.stdout, 0);
        }
        this.lineCount = 0;
    }

    /**
     * This will pause and invoke the callbacks in the properties until user calls the end method().
     * @param {*} properties 
     */
    input(...properties)
    {
        const events = new EventEmitter();
        return new Promise(resolve => {

            const { meta } = this.canvas.compileProperties(properties);
            
            // if this is not a prompt, then dont handle input and simply resolve so we can render next line.
            if(!meta.props.isTextPrompt)
                resolve();
        });
    }
    
    /**
     * This will render a line to the screen.
     * @param {*} lineData The data to render
     * @param {*} properties Any extra CanvasProperty()'s. (may include data for rendering prompts)
     */
    renderLine(lineData, ...properties)
    {
        return new Promise(resolve => {
            this.lineCount++;
            // compile the user properties
            const props = this.canvas.compileProperties(properties);
            // render output
            process.stdout.write(lineData);
            
            // prompting here.
            const { property } = this.canvas;
            this.input(
                // pass the render call's meta data into the render input middleware
                property('meta', { lineData, props })
            ).then(() => {
                // move cursor down a line.
                readline.moveCursor(process.stdout, 0, 1);
                // set cursor to start of line.
                readline.cursorTo(process.stdout, 0);
                // move line down.
                resolve();
            });

        });
    }
    
}

module.exports = CanvasRenderer;