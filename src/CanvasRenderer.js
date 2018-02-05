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
        this.firstRender = true;
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
        if(this.firstRender)
        { this.firstRender = false; return; }
        readline.moveCursor(process.stdout, 0, -(this.lineCount));
        readline.clearScreenDown(process.stdout);
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
            // console.log("g: ", this.canvas.compileProperties(properties))
            const { lineData, isPrompt } = this.canvas.compileProperties(properties);
            // incroment based on how many lines was drawn.
            this.lineCount++;
            process.stdout.write(lineData);
            
            if(!isPrompt)
            {
                // readline.moveCursor(process.stdout, 0, 1);
                readline.cursorTo(process.stdout, 0);
                
                process.stdout.write('\n');
                resolve();
                return;
            } else if(isPrompt)
            {
                console.log("Found prompt!");
            }
            

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
            this.input(...properties, this.canvas.property('lineData', lineData)).then(resolve);
        });
    }
    
}

module.exports = CanvasRenderer;