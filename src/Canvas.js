
const chalk = require('chalk');
const { EventEmitter } = require('events');
const readline = require('readline');
const cliCursor = require('cli-cursor');
const _ = require('lodash');
// easier to write.
const output = process.stdout;
const input = process.stdin;

const CanvasBuilder = require('./CanvasBuilder');
const CanvasRenderer = require('./CanvasRenderer');
const PromptAccessControl = require('./CanvasPromptManager');

function GenerateCanvasBuilder(plugins)
{
    
    
}

/**
 * The heart of a CanvasBox instance.
 * This will handle all events, dispatching and creation of sub objects and handlers.
 */
class Canvas {
    constructor(factory)
    {
        this.bindMethods.bind(this)();
        // user render factory
        this.factory = factory;
        this.builder = new CanvasBuilder(this);
        this.renderer = new CanvasRenderer(this);
        this.promptManager = new PromptAccessControl(this);
        this.developmentMode = true;
        this.developmentPort = 9000;
        this.developmentSocket = undefined;
        this.loopBackMethod = undefined;
        this.skipNext = undefined;
        this.promptCount = 0;
        // elements to render.
        this.elements = [];
        this.hasInitializedCanvas = false;
        // main model for data storage.
        this.model = {};
        this.eventHandler = new EventEmitter();
        // will point to a interval to hold the process from exiting until CanvasBox is done rendering.
        this.processHolder = null;
        this.drawCount = 0;
        this.refreshRate = 5;
        this.returnOnElement = null;
        this.init();
    }

    get rendering()
    {
        return this.renderer.rendering;
    }

    init()
    {
        if(this.developmentMode)
        {
            this.developmentSocket = require('socket.io-client')(`http://localhost:${this.developmentPort}`);
            // this.developmentSocket.emit('reset');
            console.debug = dataField => this.developmentSocket.emit('message', dataField);
        } else console.debug = ()=>{};
        // hide the cursor
        cliCursor.hide();
        // start holding the process.
        this.holdProcess();
        // setup initial events
        this.setupInternalEvents();
        // allow readline to emit key events.
        readline.emitKeypressEvents(process.stdin);
        // setup stdin keyboard events. - do not remove this listener on re-render...
        process.stdin.on('keypress', (str, key) => {
            this.eventHandler.emit('key', str, key);
            switch(key.name)
            {
                case "c":
                    if(key.ctrl)
                        this.stopProcess();
                    break;
            }
        });

        // initial render
        this.eventHandler.emit('render');
    }

    bindMethods()
    {
        this.registerElement = this.registerElement.bind(this);   
        this.compileProperties = this.compileProperties.bind(this);   
        this.render = this.render.bind(this);
        this.clearEvents = this.clearEvents.bind(this);
        this.setupInternalEvents = this.setupInternalEvents.bind(this);
        this.clearElements = this.clearElements.bind(this);
        this.holdProcess = this.holdProcess.bind(this);
        this.stopProcess = this.stopProcess.bind(this);
        this.stopElementNextCycle = this.stopElementNextCycle.bind(this);
        this.init = this.init.bind(this);
        this.property = this.property.bind(this);
        this.updateModelValue = this.updateModelValue.bind(this);
        this.promptIsPersistent = this.promptIsPersistent.bind(this);
        this.stopRenderOn = this.stopRenderOn.bind(this);
        this.getLastElement = this.getLastElement.bind(this);
    }

    /**
     * Create a basic key-value-pair
     * @param {*} key Key of model field.
     * @param {*} value Value of model field.
     */
    property(key, value)
    { return { [key]: value } }

    /**
     * Internal for updatting the model. make sure to use this method since it will invoke a render event upon invoking it.
     * @param {*} property 
     */
    updateModelValue(property, skipRenderCycle)
    {
        this.model = _.merge(this.model, property);
        // console.log("new model: ", this.model);
        // console.log("new model: ", this.model);
        if(!skipRenderCycle) this.eventHandler.emit('render');
    }

    promptIsPersistent(promptName)
    {
        for(const element of this.elements)
            if(element.writeSchema && element.writeSchema.options.persist)
            {
                console.log("assessing: ", element.writeSchema);
                return false;
            }
        return false;
    }

    holdProcess()
    {
        this.processHolder = setInterval(() => {}, 50000);
        process.stdin.setRawMode(true);
    }
    
    stopProcess()
    {
        clearInterval(this.processHolder);
        process.stdin.setRawMode(false);
        process.exit();
    }

    /**
     * Clear all events(including internal events in case a user overides a internal event)
     */
    clearEvents()
    {
        this.eventHandler.removeAllListeners('render');
        this.eventHandler.removeAllListeners('key');
        this.eventHandler.removeAllListeners('init');
        this.eventHandler.removeAllListeners('submit');
        this.eventHandler.removeAllListeners('after-render');
        this.eventHandler.removeAllListeners('stop-render');
        this.eventHandler.removeAllListeners('refresh-rate');
        this.eventHandler.removeAllListeners('onchange');
        this.eventHandler.removeAllListeners('submit');

        this.setupInternalEvents();
    }

    /**
     * Add internal events.
     */
    setupInternalEvents()
    {
        this.eventHandler.on('render', this.render);
    }

    /**
     * This will dispatch the delete event to each element event handler then reset the buffer.
     */
    clearElements()
    {
        this.elements = [];
    }

    /**
     * Will handle the re-drawing process.
     */
    async render()
    {
        this.clearEvents();
        this.clearElements();
        this.drawCount++;
        this.promptCount = 0;
        this.stopRendering = false;
        this.returnOnElement = null;
        this.eventHandler.once('stop-render', () => this.stopRendering = true);
        this.eventHandler.once('refresh-rate', rate => {
            this.refreshRate = rate;
        });
        
        if(this.developmentMode)
        {
            // this.developmentSocket.emit('reset');
            // if in dev mode connect to dev server.
            const element = this.builder.createElement(chalk.red("Logging to dev server on port: " + this.developmentPort))();
            this.elements.push(this.builder.write(element));
        }
        this.factory(this.builder);
        console.debug(`render Request[${this.drawCount}]: payload yield: ${this.elements.length} `);

        // run init event after factory so user has chance to write a init event if they want
        if(this.drawCount == 1 && !this.hasInitializedCanvas) 
        {
            this.drawCount--;
            this.hasInitializedCanvas = true;
            // re-render in case user sets default model values.
            this.eventHandler.emit('init');
            this.render();
            return;
        } 
        try {
            if(!this.renderer.onBeforeRender()) return;
            for(const canvasElement of this.elements)
            {
                if(this.skipNext == canvasElement)
                {
                    this.skipNext = undefined;
                    if(this.elements.indexOf(canvasElement) == this.elements.length - 1)
                    {
                        this.renderer.onAfterRender();
                        this.eventHandler.emit('after-render');
                        return;
                    }
                    continue;
                }
                if(!canvasElement || this.builder.isBlackListed(canvasElement)) continue;
                (await canvasElement.render(
                    this.property('lines', this.elements),
                    this.property('drawCount', this.drawCount)
                ));
                canvasElement.eventHandler.emit('finish', { target: canvasElement });
                // this element will be last if set.
                
                if(this.returnOnElement == canvasElement)
                { // for internal use only.
                    this.renderer.onAfterRender();
                    this.eventHandler.emit('after-render');
                    return;
                }
            }
            
        } catch(e)
        {
            console.debug(`Got error on cycle: ${e.message}`);
            console.debug(`     |-: ${e.fileName}`);
            console.debug(`     |-: ${e.name}`);
            console.debug(`     |-: ${e.stack}`);
            // console.log("error: ", e);
        }
        
        this.renderer.onAfterRender();
        this.eventHandler.emit('after-render');
        // return await setTimeout(() => {
        //     if(this.rendering)
        //         return this.eventHandler.once('after-render', this.render);
        //     this.render();
        // }, 1000 / 5);
        return;
    }

    stopElementNextCycle(element)
    {
        this.skipNext = element;
    }

    /**
     * Will render until the given element index. 
     * @param {*} elementIndex 
     */
    stopRenderOn(element)
    {
        this.returnOnElement = element;
    }

    getLastElement()
    {
        return this.elements[this.elements.length - 1];
    }

    /**
     * Will compile key-value-pair properties into a object.
     * @param {*} props 
     */
    compileProperties(props)
    {
        let allProps = {};
        // build object from Array<Key-Value-Pair>'s
        _.forEach(props, p => {
           allProps = _.merge(allProps, p); 
        });
        return allProps;
    }

    /**
     * Register element to the render queue.
     * @param {*} element 
     */
    registerElement(element)
    {
        this.elements.push(element);
    }

}

module.exports = Canvas;