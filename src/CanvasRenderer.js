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
            const { element } = this.canvas.compileProperties(properties);
            const { prompt } = element;
            const { property } = this.canvas;

            // incroment based on how many lines was drawn.
            this.lineCount++;
            process.stdout.write(element.renderBuffer[0]);
            
            if(!prompt)
            {
                // regular render.
                readline.cursorTo(process.stdout, 0);
                process.stdout.write('\n');
                resolve();
                return;
            } else if(prompt)
            {
                // text prompt render
                
                cliCursor.show();
                // Note; When we submit use model(field)(newValue, true)
                // instead of model(field)(newValue)
                // This will skip the render cycle so the canvas doesnt re-render.
                let currentValue = this.canvas.builder.model(prompt.name)().split("");
                CanvasInputManager(this.canvas) (
                    // on key down event
                    property('key', (key, doReturn) => { 
            // TODO: make this work good. find solution for the problem where if i update the model while typing 
            // i will have to go through all the prompts again but at same time i want to auto update fields in the canvas to reflect.
                        if(key.name == 'return')
                            doReturn();
                        else
                        {
                            // update the buffer
                            currentValue.push(" TEST ");
                            // clear the line
                            readline.clearLine(process.stdout);
                            // reset cursor position
                            readline.cursorTo(process.stdout, 0);
                            // write new data to line.
                            process.stdout.write(element.renderBuffer[0] + currentValue.join(""));
                        }
                    })
                ).then(() => {
                    cliCursor.hide();
                    // regular render.
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write('\n');
                    resolve();
                    return;
                });
            }
            

        });
    }
    
    /**
     * This will render a line to the screen.
     * @param {*} lineData The data to render
     * @param {*} properties Any extra CanvasProperty()'s. (may include data for rendering prompts)
     */
    renderLine(element, ...properties)
    {
        return new Promise(resolve => {
            this.input(properties, this.canvas.property('element', element)).then(resolve);
        });
    }
    
}

module.exports = CanvasRenderer;