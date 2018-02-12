const { EventEmitter } = require('events');

const readline = require('readline');
const chalk = require('chalk');
const CanvasInputManager = require('./CanvasInputManager');
const cliCursor = require('cli-cursor');
const _ = require('lodash');

/**
 * Will handle all rendering to screen.
 * CanvasRenderer version 2.0.
 */
class CanvasRenderer
{
    constructor(canvas)
    {
        this.bindMethods.bind(this)();
        this.canvas = canvas;
        // this is what is currently onscreen. we will use these two buffers to calculate what to take off the end.
        this.renderBuffer = [];
        this.rendering = false;
        this.firstRender = true;
        // this gets reset everytime - current render cycle output
        this.scratchBuffer = [];
        this.cursorPositionY = 0;
        this.lines = 0;
    }

    bindMethods()
    {
        this.renderLine = this.renderLine.bind(this);
        this.clearLines = this.clearLines.bind(this);
        this.offsetTo = this.offsetTo.bind(this);
        this.newLine = this.newLine.bind(this);
        this.clearLine = this.clearLine.bind(this);
        this.deleteDown = this.deleteDown.bind(this);
        this.deleteUp = this.deleteUp.bind(this);
        this.onAfterRender = this.onAfterRender.bind(this);
        this.onBeforeRender = this.onBeforeRender.bind(this);
        this.renderSchema = this.renderSchema.bind(this);
        this.renderTextAnimation = this.renderTextAnimation.bind(this);
        this.renderTextPrompt = this.renderTextPrompt.bind(this);
        this.clearRenderBuffers = this.clearRenderBuffers.bind(this);
        this.renderSelection = this.renderSelection.bind(this);
    }

    clearLines()
    { 
        if(this.firstRender)
        {
            this.firstRender = false;
            return;
        }
        // right now this doesnt clear the screen. but simply resets the render scratch buffer.
        this.renderBuffer = this.scratchBuffer;
        this.scratchBuffer = [];
    }

    /**
     * When a element is removed in the middle of the array we have to
     * @param {*} startAt 
     */
    deleteDown(startAt)
    {
        this.offsetTo(startAt);
        readline.clearScreenDown(process.stdout);
    }

    deleteUp(startAt)
    {

    }

    newLine()
    { this.lines++; process.stdout.write('\n'); }

    /**
     * Focus on a line
     * @param {*} targetLine 
     */
    offsetTo(targetLine)
    {
        let offset = 0;
        if(targetLine > this.cursorPositionY)
            offset = (targetLine - this.cursorPositionY);
        else if(targetLine < this.cursorPositionY)
            offset = -(this.cursorPositionY - targetLine);

        readline.moveCursor(process.stdout, 0, offset);
        readline.cursorTo(process.stdout, 0);
        this.cursorPositionY += offset;

        return this.offset;
    }

    /** 
     * This will forcefully override a screen refresh and delete the buffers.
     * This is to combat te issue of dual line rendering(bug)
    */
    clearRenderBuffers()
    {
        for(let i = 0; i <= this.lines; i++)
            this.clearLine(i);
        this.scratchBuffer = [];
        this.renderBuffer  = [];
    }

    /**
     * Clear a line
     * @param {*} line 
     */
    clearLine(line)
    {
        const offset = this.offsetTo(line);
        readline.clearLine(process.stdout);
        readline.cursorTo(process.stdout, 0);
    }

    /**
     * Will render a line to the screen.    
     * @param {*} buffer The buffer to write    
     * @param {*} line What line to write on
     * @param {*} writeOver If false then will only write the line if it has changed else it will write over it anyways.
     */
    renderLine(buffer, line, writeOver = false)
    {
        const createLines = () => {
            // keep at bottom...
            if(line > this.lines) 
            {
                const toAdd = (line - this.lines);
                console.debug(`creating ${toAdd} line(s) on cycle ${this.canvas.drawCount}`);
                // this.lines += toAdd;
                for(let i = 0; i < toAdd; i++)
                    this.newLine();
            }
        };
        
        let existsInRenderBuffer = this.renderBuffer.indexOf(buffer) !== -1;
        if(!existsInRenderBuffer) createLines(); // may need this in future.
        // scratch buffer is what user renders out this session.
        if(this.scratchBuffer.length < line)
        this.scratchBuffer.push(buffer);
        else if(this.scratchBuffer.length >= line)
        this.scratchBuffer[line] = buffer;
        
        // create non-existent lines
        
        if(this.renderBuffer[line] !== buffer || writeOver)
        { 
            this.clearLine(line);
            this.offsetTo(line);
            process.stdout.write(buffer);
        } else if(!existsInRenderBuffer)
        {
            this.offsetTo(line);
            process.stdout.write(buffer);
        }
        
        // if(line > this.lines)
        //     createLines();
        
    }

    onBeforeRender()
    {
        if(this.rendering)  
            return false;
        return this.rendering = true;
    }

    /**
     * Trim old unrendered lines
     */
    onAfterRender()
    {
        if(this.scratchBuffer.length < this.renderBuffer.length)
        {
            // const doFor = (this.renderBuffer.length - 1) - (this.scratchBuffer.length - 1);
            // for(let i = 0; i <= doFor; i++)
            //     this.clearLine(i + (this.scratchBuffer.length - 1));
            // // sync active state up
            // this.scratchBuffer.splice((this.scratchBuffer.length - 1) - doFor, doFor);
            // this.rendering = false;
            // console.debug(`onAfterRender() doFor:${doFor} on line`);
            // return this.canvas.render(); // invoke another render to re-write the lines lost.
            
            for(let i = 0; i <= this.renderBuffer.length - this.scratchBuffer.length; i++)
                this.scratchBuffer.pop(); 
            this.rendering = false;
            return this.canvas.render();

            // throw new Error(`itemsRemoved:${itemsRemoved}, doFor: ${doFor}, scratchBuffer:${this.scratchBuffer.length}, the renderBUffer: ${this.renderBuffer.length}`);
        }
        this.rendering = false;
    }  

        /**
     * Will Render a schema and continue rendering after its .promise is resolved. the new line will be appended upon .resolve.
     * This will collect a key press then set the model to the value and the system will re-render.
     * Schema's are promise based rendering api's witch allows for easy expansion. they use PromptManagers to handle witch is current schema.
     * @param {*} element The element containing the schema to render
     * @param {*} properties render properties
     */
    renderSchema(element, line, ...properties)
    {
        if(element && element.writeSchema)
        {
            if(this.canvas.builder.isBlackListed(element)) return Promise.resolve();
            switch(element.writeSchema.type)
            {
                case "prompt":
                    return this.renderTextPrompt(element, line, properties);
                case "animation":
                    return this.renderTextAnimation(element, line, properties);
                case "prompt-selection":
                    return this.renderSelection(element, line, properties);
            }
        }
    }
    
    renderTextPrompt(element, line, ...properties)
    {
        return new Promise(resolvePrompt => {
            const value = this.canvas.builder.value(element.writeSchema.name);
            const renderInput = () => this.renderLine(element.renderBuffer[0] + value, line, true);
            renderInput();
            if(!this.canvas.promptManager.isCurrent())
                return resolvePrompt();
            cliCursor.show();
            CanvasInputManager(this.canvas).collectKey(keyboardEvent => {
                this.canvas.builder.set(element.writeSchema.name)(value + keyboardEvent.str, false);
                
                keyboardEvent.stopListening();
                resolvePrompt();
            });
        });
    }

    renderSelection(element, startLine, properties)
    {
        return new Promise(resolveSelection => {
            for(let i = 0; i < element.writeSchema.fields.length; i++)
                this.renderLine(element.writeSchema.fields[i], i + this.lines);
        });
    }

    /**
     * Will render a text based animation. 
     * @param {*} element The animation element.
     */
    async renderTextAnimation(element, line, properties)
    {
        // so people can write more complex animations
        let animationState = {};
        const options = this.canvas.compileProperties(properties);
        const { writeSchema } = element;
        if(!writeSchema.interval || !writeSchema.frames)
            return;
        let framesRendered = 0;
        const animate = frame => new Promise(resolveFrame => {
            framesRendered++;
            let prefix = element.renderBuffer[0];

            writeSchema.middleware.forEach(middleware => {
                const middleOut = middleware(writeSchema.frames.indexOf(frame), prefix, frame, animationState, {
                    animationLength: writeSchema.frames.length * writeSchema.interval,
                    remainingLength: (writeSchema.frames.length * writeSchema.interval) / framesRendered,
                    remainingFrames: writeSchema.frames.length - framesRendered,
                    currentFrame: framesRendered,
                    frames: writeSchema.frames, 
                    interval: writeSchema.interval,
                    addFrame: frameContents => writeSchema.frames.push(frameContents), 
                    setInterval: interval => writeSchema.interval = interval,
                });
                prefix = middleOut.prefix;
                frame = middleOut.frame;
                animationState = _.merge(animationState, middleOut.state);
            });

            this.renderLine(prefix + frame, line, true);

            setTimeout(() => {
                // console.debug(`[cycle ${this.canvas.builder.drawCount()}]: Resolving animation frame: ${frame}, frame wrote: ${element.renderBuffer[0] + frame} \n on line: ${line}`);
                resolveFrame();
            }, writeSchema.interval);
        });

        for(const frame of writeSchema.frames)
            (await animate(frame));

        return;
    }

}

module.exports = CanvasRenderer;