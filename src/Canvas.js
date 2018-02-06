
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


/**
 * The heart of a CanvasBox instance.
 * This will handle all events, dispatching and creation of sub objects and handlers.
 */
class Canvas {
    constructor(factory, options)
    {
        this.bindMethods.bind(this)();
        // user render factory
        this.factory = factory;
        this.options = options;
        this.builder = new CanvasBuilder(this);
        this.renderer = new CanvasRenderer(this);
        this.promptManager = new PromptAccessControl(this);
        
        // elements to render.
        this.elements = [];
        // Number of prompts registered to be rendered, this is to keep track of when to reset them.
        this.promptCount = 0;
        // main model for data storage.
        this.model = {};
        this.eventHandler = new EventEmitter();
        // will point to a interval to hold the process from exiting until CanvasBox is done rendering.
        this.processHolder = null;
        this.drawCount = 0;
        this.init();
    }

    init()
    {
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
        this.init = this.init.bind(this);
        this.property = this.property.bind(this);
        this.updateModelValue = this.updateModelValue.bind(this);
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
        this.elements.forEach(element => element.eventHandler.emit('delete'));
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
        this.factory(this.builder);

        for(const canvasElement of this.elements)
            (await canvasElement.render(
                this.property('lines', this.elements),
                this.property('drawCount', this.drawCount)
            ));

        return;
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