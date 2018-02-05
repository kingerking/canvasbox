// import { clearTimeout } from 'timers';

// import { clearTimeout } from 'timers';




const {EventEmitter} = require('events');
const readline = require('readline');
const _ = require('lodash');
const Prompt = require('input-promptify');

/**
 * Base line creation options.
 */
const BASE_LINE_CREATION_OPTIONS = {

};

const BASE_CANVAS_CREATION_OPTIONS = {
    showCursor: false
};


/**
 * Handles all rendering and line management.
 */
class CanvasModel {
    constructor(options, userCanvasFactory)
    {
        this.userCanvasFactory = userCanvasFactory;
        this.options = options;
        this.configure.bind(this)(this.options);
        // this.startAt = 
        this.eventHandler = new EventEmitter();
        // Array of line models, 0 being top line and <last index> being last line.
        this.lines = []; // All lines to render..
        this.firstRender = true;
        this.render = this.render.bind(this);
        this.userApi = this.userApi.bind(this);
        this.clearBuffers = this.clearBuffers.bind(this);
        this.startLoop = this.startLoop.bind(this);
        this.stopLoop = this.stopLoop.bind(this);
        this.linesWithPrompts = this.linesWithPrompts.bind(this);
        this.clearCanvas = this.clearCanvas.bind(this);
        this.modelUpdateRender = this.modelUpdateRender.bind(this);
        this.invokeAndDeleteAbortionHandlers = this.invokeAndDeleteAbortionHandlers.bind(this);
        this.currentLine = 0;
        // this.clearCanvas = this.clearCanvas.bind(this);
        this.interval;
        // this.render();
        this.startLoop();
        // canvas model does not reset each render cycle.
        this.canvasModel = {};
        // Prompt abortion handlers.
        this.aborters = {};
        this.renderPromise = null;
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => key.ctrl && key.name == 'c' ? process.exit() : null);

    }

    startLoop() 
    {

        
        const prom = new Promise(resolve => {
            this.renderPromise = this.render().then(() => resolve());
            this.eventHandler.once('model-render', () => {
                this.renderPromise = null;
                // readline.moveCursor(process.stdout, 0, ((this.currentLine + 1) + this.linesWithPrompts().length));
                // readline.cursorTo(process.stdout, 0);
                // this.clearCanvas();
                clearTimeout(this.interval);
                this.startLoop();
            });
        });
        prom.then(() => {
            this.interval = setTimeout(() => {
                this.startLoop();
            }, 200);
        });
        
    }

    stopLoop()
    {
        clearTimeout(this.interval);
    }

    configure(options) 
    {
        options.showCursor ? require('cli-cursor').show() : require('cli-cursor').show();
    }

    clearBuffers() 
    {
        this.invokeAndDeleteAbortionHandlers();
        this.lines = [];
    }
    
    clearCanvas() 
    {
        readline.moveCursor(process.stdout, -1, -((this.lines.length) + this.linesWithPrompts().length))
        this.clearBuffers();
        readline.clearScreenDown(process.stdout, 1);
    }

    linesWithPrompts()
    {
        return _.without(_.map(this.lines, line => !!line.prompt ? line : null), null);
    }

    invokeAndDeleteAbortionHandlers()
    {
        // _.forEach(this.aborters, aborter => aborter.emit('abort'));
        this.aborters = {};
    }

    /**
     * Will clear the render loop and restart to safly re-render.
     */
    async modelUpdateRender()
    {
        // invoke then delete all abortion handlers.
        // this.clearBuffers();
        // this.clearCanvas();
        // this.eventHandler.emit('force-re-draw');
        // this.stopLoop();
        // this.startLoop();
    }

    /**
     * Render each line.
     * This is a forced render and is not recommended due to inefficiency.
     */
    async render() {

            // reset events so they dont constantly get reset every tick. (TODO THIS BEFORE userCanvasFactory is invoked(thats where users define events))
        this.eventHandler.removeAllListeners('model-value-add');
        this.eventHandler.removeAllListeners('prompt-finish');
        this.eventHandler.removeAllListeners('model-update');
        this.eventHandler.removeAllListeners('force-re-draw');
        this.eventHandler.removeAllListeners('model-render');

        // explore using canvas.clear() so users can have a log of their canvas if they want.
        // this.clearBuffers();
        const userRender = this.userCanvasFactory( this.userApi() );
        


        // if(!this.firstRender)
            
        
        let restartLoopAfterFinish = false;
        const newAborters = {};
        for(const line of this.lines)
        {
            this.currentLine = this.lines.indexOf(line);
            if(!!line.prompt)
            {
                const abortionHandler = new EventEmitter();
                newAborters[line.prompt.name] = abortionHandler;
                this.aborters = newAborters;
                if(this.canvasModel == undefined)
                    this.canvasModel = {};
                const startWith = (this.canvasModel && this.canvasModel[line.prompt.name] ? 
                    this.canvasModel[line.prompt.name] : "");
                    
                const returned = await Prompt(line.baseContents + " ", _.merge(line.prompt.options, {
                    startWith,
                    abortHandler: abortionHandler
                }));
                // console.log('d')
                // console.log("new canvas model property: ", returned);
                this.canvasModel[line.prompt.name] = returned;
                this.eventHandler.emit('model-update', { name: line.prompt.name, value: this.canvasModel[line.prompt.name] }, this.canvasModel);

                this.eventHandler.emit('prompt-finish', returned, line.prompt, line);
                this.eventHandler.emit('model-value-add', 
                    { name: line.prompt.name, value: this.canvasModel[line.prompt.name] });
                // this.eventHandler.emit('model-update', this.canvasModel);
                // delete abortion handler.
                this.aborters[line.prompt.name] = undefined;
                process.stdout.write(" \n");
                continue;
            }
            
            process.stdout.write(line.baseContents + " \n");
        }

        
        
        // if(restartLoopAfterFinish)
        //     this.startLoop();

        this.firstRender = false;
        return this.eventHandler.emit('after-render');
      
    }


    /**
     * This is a collection of method the user has access to.
     */
    userApi(){
        return {
            /**
             * Create a line.
             */
            write: (contents = "", prompt, options) => (new LineModel(this, prompt, contents, this.lines.length, BASE_LINE_CREATION_OPTIONS)).userApi(),
            writeOnce: factory => {
                
            },
            /**
             * Map the event system to user.
             */
            on: this.eventHandler.on,
            /**
             * Map the event system to user.
             */
            once: this.eventHandler.once,
            /**
             * Exit the canvas
             */
            end: () => clearInterval(this.interval),
            /**
             * Will construct a prompt schema. pass the schema into a write call as the second paramter and
             * the prompt will be executed.
             */
            prompt: (name, ...extraOptions) => {
                return promptOptions => {
                    if(promptOptions instanceof Array)
                    {
                        promptOptions = {
                            selectable: promptOptions
                        };
                        if(!!extraOptions[0] && extraOptions[0] instanceof Boolean)
                        {
                            console.log("enabling multiselection mode.")
                            promptOptions.multiSelection = true;
                        }
                    }
                    // will update model to current value every keypress.
                    if(!!promptOptions && !!promptOptions.syncState)
                    { // Sort of working right now.
                        promptOptions.keyboardEvent = (str, key) => {
                            // console.log("key: ", key);
                            console.log("updating from ", this.canvasModel[name]);
                            if(this.canvasModel == undefined)
                            {
                                this.canvasModel = {};
                                this.canvasModel[name] = "";
                            } else if(this.canvasModel && !this.canvasModel[name])
                                this.canvasModel[name] = "";

                            
                                if(key.name == 'backspace')
                                {
                                    if(this.canvasModel[name].length > 0)
                                    {
                                        let str = this.canvasModel[name].split("");
                                        str[str.length - 1] = null;
                                        str = _.without(str, null);
                                        this.canvasModel[name] = str.join("");
                                    }
                                } else if(key.name == 'space')
                                    this.canvasModel[name] += " ";
                                else if(key.name !== 'backspace')
                                    this.canvasModel[name] += key.name;
                                
                            // console.log("to ", this.canvasModel[name]);
                            this.eventHandler.emit('model-render', {name, value: this.canvasModel[name]}, this.canvasModel);
                            // this.modelUpdateRender();

                        };
                    }

                    return {
                        name, options: !!promptOptions ? promptOptions : {}
                    };
                };
            },
            /**
             * Require a model value
             */
            model: searchFor => {
                // if user passes array of required values then return a Object, else just the value
                const objectReturnMode = searchFor instanceof Array;
                const query = objectReturnMode ? searchFor : [searchFor];
                const returnBuffer = {};
                // user runs this function
                const onFound = (userCallback, fallback = () => {}) => {
                    
                    const checkBuffer = () => {
                        _.forEach(this.canvasModel, (value, key) => {
                            const i = query.indexOf(key);
                            if(i != -1)
                            {
                                returnBuffer[key] = value;
                                query.splice(i, 1);
                            }
                        });
                    };
                    checkBuffer();
                    // already exists in buffer.
                    if(query.length == 0)
                        return userCallback(objectReturnMode ? returnBuffer : _.toArray(returnBuffer)[0]);
                    else
                        fallback();

                    const onUpdate = property => {
                        checkBuffer();
                        if(query.length == 0)
                        {
                            // found everything.
                            this.eventHandler.removeListener('model-value-add', onUpdate);
                            // userCallback(objectReturnMode ? returnBuffer : returnBuffer[property.name]);
                        } else fallback();
                    };
                    // add a event listener - NOTE: Fix memory leak when listening for a model property that is never added.
                    // if(this.eventHandler.listeners('model-value-add').indexOf(onUpdate) == -1)
                    this.eventHandler.on('model-value-add', onUpdate);
                };
                return onFound;
            },
            /**
             * Set a model value.
             */
            set: modelKey => {
                if(!this.canvasModel) this.canvasModel = {};
                return value => this.canvasModel[modelKey] = value;
            },
            /**
             * TEST THIS.
             */
            event: name => {
                const returnObject = userCallback => {
                    return this.eventHandler.on(name, userCallback);
                };
                return returnObject;
            },
            clear: () => {
                this.clearCanvas()
            },

            /**
             * For purpose of encapsulation / modular code.
             * basically defines a fragment of the application.
             */
            fragment: requiredModelProperties => {
                return fragmentRenderer => {
                    this.userApi().model(requiredModelProperties)(modelFragment => 
                        fragmentRenderer(this.userApi(), modelFragment));
                };
            },
        }
    };

}

class LineModel {
    constructor(parentModel, prompt, baseContents, index, options)
    {
        this.parentModel = parentModel;
        this.baseContents = baseContents;
        this.prompt = prompt;

        this.currentLineValue = baseContents;
        
        this.userApi = this.userApi.bind(this);
        
        // console.log("Rendered one");
        // if(baseContents instanceof String)
        parentModel.lines.push(this);
    }


    /**
     * Line api model.
     */
    userApi() {
        return {
            
        }
        
    }
}


module.exports = userRenderFunction => (new CanvasModel(BASE_CANVAS_CREATION_OPTIONS, userRenderFunction)).userApi();