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
        this.renderBuffer = [];
        this.firstRender = true;
        this.cursorPositionY = 0;
    }

    bindMethods()
    {
        this.clearLines = this.clearLines.bind(this);
        this.renderLine = this.renderLine.bind(this);
        this.renderSchema = this.renderSchema.bind(this);
        this.newLine = this.newLine.bind(this);
        this.write = this.write.bind(this);
        this.clearWindow = this.clearWindow.bind(this);
        this.renderTextPrompt = this.renderTextPrompt.bind(this);
        this.renderTextAnimation = this.renderTextAnimation.bind(this);
        // this.clearLine = this.clearLine.bind(this);
        this.writeToLine = this.writeToLine.bind(this);
        this.checkBuffer = this.checkBuffer.bind(this);
        this.calculateCursorOffset = this.calculateCursorOffset.bind(this);
    }

    
    /**
     * Will clear bottom to top of all current lines.
     * Then user can draw since cursor will be at the top of screen.
     */
    clearLines()
    {
        // readline.moveCursor(process.stdout, 0, -this.cursorPositionY);
        // readline.cursorTo(process.stdout, 0);
        // this.lineCount = 0;
        // this.cursorPositionY = 0;
        this.lineCount = 0;
    }

    /**
     * experimentalew scheme for rendering. this is to combat the rendering flicking issue with bash terminals and occasional flickering in zsh
     * @param index index to move to.
     */
    // clearLine(lineToClear)
    // { 
    //     let offset = this.calculateCursorOffset(lineToClear, this.cursorPositionY);

    //     this.cursorPositionY = offset;
    //     // move to target line.
    //     readline.moveCursor(process.stdout, 0, offset);
    //     // remove it
    //     readline.clearLine(process.stdout);
    //     // this.lineCount--;
    // }

    calculateCursorOffset(lineTarget, from)
    {
        let offset = 0;

        if(lineTarget > from)
            offset = (lineTarget - from);
        else if(lineTarget < from)
            offset = (from - lineTarget);
        return offset;
    }

    
    checkBuffer(line, data)
    {
        if(this.renderBuffer.length > line)
        {
            this.renderBuffer.push(data);
            return true; // do change
        } else if(this.renderBuffer[line] == data)
        {
            return false; // no changes
        }
        this.renderBuffer[line] = data;
        return true;
    }

    writeToLine(data, line = this.lineCount)
    {
        const dataToWrite = data;
        if(!this.checkBuffer(line, data)) return;
        // do this after checking buffer
        this.cursorPositionY = this.calculateCursorOffset(line, this.cursorPositionY);
        readline.moveCursor(process.stdout, 0, this.clearWindow);
        readline.clearLine(process.stdout);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(dataToWrite);
    }

    /**
     * Simply write a buffer to the screen
     * @param {*} data buffer to write.
     */
    write(data)
    {

        // replace space at beginning if one exists.
        // reason for not simply poping or trimming is becasue then user can input a space.
        data = data.replace('\n', '').split("");
        if(data[0] == " ")
            data.pop();
        data = data.join("");
        this.writeToLine(data);
    }

    /**
     * This Will create a new line to write.
     */
    newLine()
    {
        // process.stdout.write('\n');
        // readline.cursorTo(process.stdout, 0);
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

    clearWindow()
    {
        console.clear();
    }

    /**
     * Will Render a schema and continue rendering after its .promise is resolved. the new line will be appended upon .resolve.
     * This will collect a key press then set the model to the value and the system will re-render.
     * Schema's are promise based rendering api's witch allows for easy expansion. they use PromptManagers to handle witch is current schema.
     * @param {*} element The element containing the schema to render
     * @param {*} properties render properties
     */
    renderSchema(element, ...properties)
    {
        if(element && element.writeSchema)
        {
            switch(element.writeSchema.type)
            {
                case "prompt":
                    return this.renderTextPrompt(element, properties);
                case "animation":
                    return this.renderTextAnimation(element, properties);
            }
        }
    }

    renderTextPrompt(element, ...properties)
    {
        return new Promise(resolve => {
            const props = this.canvas.compileProperties(properties);
            // get current value from the model.
            let modelValue = this.canvas.builder.model(element.writeSchema.name)();
            const renderBuffer = element.renderBuffer[0] + modelValue;
            // write the prefix and current model value to the screen.
            this.renderLine(renderBuffer, element.index);
            
            // if this isnt the current prompt to render then resolve and continue.
            if(!this.canvas.promptManager.isCurrent(element.writeSchema))
            {
                this.newLine();
                return resolve();
            }
            
            cliCursor.show();
            const enableRealtimeModelMode = props['realtime-model-engine'] === false ? false : props['realtime-model-engine'];
            CanvasInputManager(this.canvas).collectKey( !enableRealtimeModelMode ).then(returned => {
                const { key, str } = returned;
                let valueToWrite = str;
                // DO NOT RESOLVE UNLESS RETURN IS PRESSED
                if(key && key.name == 'return')
                { // todo filter out undefined
                    cliCursor.hide();
                    this.newLine();
                    this.canvas.promptManager.finish(element.writeSchema);
                    return resolve();
                } else if(key && key.name == 'backspace')
                {
                    modelValue = modelValue.substring(0, modelValue.length - 1);

                } else if(key && key.name == "space")
                {
                    modelValue += " ";
                } 
                else modelValue += valueToWrite ? valueToWrite  : "";
                // hide cursor
                cliCursor.hide();
                // create a new line
                this.newLine();
                // check for enter, if not set model value, then return.
                this.canvas.updateModelValue(this.canvas.property(element.writeSchema.name, modelValue));
                
            });

        });
    }

    /**
     * Render a array of lines.
     * @param {*} lines 
     */
    renderLines(lines)
    {
        return new Promise(resolve => {
            _.forEach(lines, line => {
                this.renderLine(line);
                this.newLine();
            });
        });
    }

    /**
     * Will render a line 
     * @param {*} element 
     * @param {*} properties 
     */
    async renderTextAnimation(element, ...properties)
    {
        const options = this.canvas.compileProperties(properties);
        const { writeSchema } = element;
        if(!writeSchema.interval || !writeSchema.frames)
            return;
        // will write a frame
        const writeFrame = line => new Promise(resolve => {
            this.write(element.renderBuffer[0] + line);
            setTimeout(() => {
                // clear the line for next frame.
                readline.clearLine(process.stdout);
                // reset cursor position
                readline.cursorTo(process.stdout, 0);
                // this.newLine();
                resolve();
            }, writeSchema.interval);
        });

        for(const frame of writeSchema.frames)
            await writeFrame(frame);
        // write a new line so my framework doesnt yell at me.
        this.newLine();
        return;
    }
    
}

module.exports = CanvasRenderer;