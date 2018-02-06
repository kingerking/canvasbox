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
        this.renderPrompt = this.renderPrompt.bind(this);
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
            const compiledProperties = this.canvas.compileProperties(properties);
            const { element } = compiledProperties;
            const { property } = this.canvas;

            // incroment based on how many lines was drawn.
            this.lineCount++;
            process.stdout.write(element.renderBuffer[0]);

            if(!element.prompt)
            {
                // this.lineCount++;
                // regular render.
                process.stdout.write('\n');
                readline.cursorTo(process.stdout, 0);
                resolve();
                return;
            } else if(element.prompt)
                this.renderPrompt(compiledProperties).then(resolve);
            
            

        });
    }
    
    /**
     * This will render a line to the screen.
     * Note: for rendering prompt you should still go through this method because it runs the 
     * necessary internal operations to properly handle a prompt
     * @param {*} lineData The data to render
     * @param {*} properties Any extra CanvasProperty()'s. (may include data for rendering prompts)
     */
    renderLine(element, ...properties)
    {
        return new Promise(resolve => {
            this.input(properties, this.canvas.property('element', element)).then(resolve);
        });
    }

    renderPrompt({ element })
    {
        const resolvePromptToNextItem = resolve => {
            cliCursor.hide();
            // regular render.
            process.stdout.write('\n');
            readline.cursorTo(process.stdout, 0);
            // process.stdout.write('\n');
            resolve();
        };

        return new Promise(resolve => {
            const { prompt } = element;
            const { property } = this.canvas;
            cliCursor.show();

            // current value of model buffer.
            let currentValue = this.canvas.builder.model(prompt.name)().split("");
            // render current value.
            process.stdout.write(currentValue.join(""));
            // resolve to next prompt if this prompt has been completed.
            
            if(!this.canvas.promptManager.isCurrent(prompt))
                return resolvePromptToNextItem(resolve);
            

            CanvasInputManager(this.canvas) (
                // on key down event
                property('key', (key, doReturn) => { 
        // TODO: make this work good. find solution for the problem where if i update the model while typing 
        // i will have to go through all the prompts again but at same time i want to auto update fields in the canvas to reflect.
                    if(key.name == 'return')
                    {
                        this.canvas.promptManager.finish(prompt);
                        return doReturn();
                    }
                    else
                    {
                        // so it looks like the cursor is on a line
                        process.stdout.write('\n');
                        currentValue.push(key.name);
                        this.canvas.builder.model(prompt.name)(currentValue.join(""));
                        return resolve();
                    }
                }),
                property('load', (doReturn) => {
                    
                    
                })
            ).then(() => resolvePromptToNextItem(resolve));
        });
    }
    
}

module.exports = CanvasRenderer;