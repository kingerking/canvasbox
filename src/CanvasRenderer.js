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
    }

    clearLines()
    { // right now this doesnt clear the screen. but simply resets the render scratch buffer.
        this.renderBuffer = this.scratchBuffer;
        this.scratchBuffer = [];
        // readline.cursorTo(process.stdout, 0);
        // readline.moveCursor(process.stdout, 0, -this.cursorPositionY);
        // this.cursorPositionY = 0;
        // this.lines = 0;
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

    clearLine(line)
    {
        const offset = this.offsetTo(line);
        readline.clearLine(process.stdout);
        readline.cursorTo(process.stdout, 0);
    }

    renderLine(buffer, line, properties)
    {

        // const createLines = () => {
        //     // keep at bottom...
        //     if(line > this.lines) 
        //     {
        //         const toAdd = (line - this.lines);
        //         this.lines += toAdd;
        //         for(let i = 0; i < toAdd; i++)
        //             this.newLine();
        //     }
        // };

        // scratch buffer is what user renders out this session.
        if(this.scratchBuffer.length < line)
            this.scratchBuffer.push(buffer);
        else if(this.scratchBuffer.length >= line)
            this.scratchBuffer[line] = buffer;
        
        let existsInRenderBuffer = this.renderBuffer.indexOf(buffer) !== -1;
        
        if(line > this.lines)
            this.newLine();

        if(existsInRenderBuffer && this.renderBuffer[line] !== buffer)
        {
            this.clearLine(line);
            this.offsetTo(line);
            process.stdout.write(buffer);
        } else if(!existsInRenderBuffer)
        {
            this.offsetTo(line);
            process.stdout.write(buffer);
        }
        
        if(line > this.lines)
            createLines();
        
    }

    onBeforeRender()
    {
        
    }

    onAfterRender()
    {
        
    }
    

}

module.exports = CanvasRenderer;