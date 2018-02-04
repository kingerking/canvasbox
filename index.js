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
        this.lines = [];
        this.firstRender = true;
        this.render = this.render.bind(this);
        this.userApi = this.userApi.bind(this);
        this.clearBuffers = this.clearBuffers.bind(this);
        this.startLoop = this.startLoop.bind(this);
        this.stopLoop = this.stopLoop.bind(this);
        this.linesWithPrompts = this.linesWithPrompts.bind(this);
        // this.clearCanvas = this.clearCanvas.bind(this);
        this.interval;
        // this.render();
        this.startLoop();
        // canvas model does not reset each render cycle.
        this.canvasModel = {};
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => key.ctrl && key.name == 'c' ? process.exit() : null);

    }

    startLoop() 
    {
        this.render().then(() => {
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
        this.lines = [];
    }
    
    linesWithPrompts()
    {
        return _.without(_.map(this.lines, line => !!line.prompt ? line : null), null);
    }

    /**
     * Render each line.
     * This is a forced render and is not recommended due to inefficiency.
     */
    async render() {
        // readline.cursorTo(process.stdout, 0, 0);
        // readline.clearScreenDown(process.stdout);
        
        // explore using canvas.clear() so users can have a log of their canvas if they want.
        this.clearBuffers();
        const userRender = this.userCanvasFactory( this.userApi() );
        const resetCursor = () => readline.moveCursor(process.stdout, 0, -(this.lines.length));

        if(!this.firstRender)
            resetCursor();
        readline.clearScreenDown(process.stdout);
        let restartLoopAfterFinish = false;

        for(const line of this.lines)
        {
            if(!!line.prompt)
            {
                const returned = await Prompt(line.baseContents);
                // console.log("new canvas model property: ", returned);
                this.canvasModel[line.prompt.name] = returned;
                this.eventHandler.emit('prompt-finish', returned, line.prompt, line);
                this.eventHandler.emit('model-value-add', 
                    { name: line.prompt.name, value: this.canvasModel[line.prompt.name] });
                this.eventHandler.emit('model-update', this.canvasModel);
                // resetCursor();
                // readline.moveCursor(process.stdout, 0, -(this.lines.indexOf(line)));
                // readline.clearLine(process.stdout);
                // // clear current prompt then write a fake one.
                process.stdout.write(line.baseContents + "\n");
                continue;
            }
            
            process.stdout.write(line.baseContents + "\n");
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
            prompt: (name, options) => {
                return {
                    name, options
                };
            },
            model: searchFor => {
                // if user passes array of required values then return a Object, else just the value
                const objectReturnMode = searchFor instanceof Array;
                const query = objectReturnMode ? searchFor : [searchFor];
                const returnBuffer = {};
                // user runs this function
                const onFound = userCallback => {
                    
                    const checkBuffer = () => {
                        _.forEach(this.canvasModel, (value, key) => {
                            // console.log('checking: ', property)
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
                    

                    const onUpdate = property => {
                        checkBuffer();
                        if(query.length == 0)
                        {
                            // found everything.
                            this.eventHandler.removeListener('model-value-add', onUpdate);
                            // userCallback(objectReturnMode ? returnBuffer : returnBuffer[property.name]);
                        }
                    };
                    // add a event listener.
                    this.eventHandler.on('model-value-add', onUpdate);
                };
                return onFound;
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
            clear: () => {},

            /**
             * For purpose of encapsulation / modular code.
             * basically defines a fragment of the application.
             */
            fragment: requiredModelProperties => {
                return fragmentRenderer => {
                    this.userApi().model(requiredModelProperties)(modelFragment => fragmentRenderer(this.userApi(), modelFragment));
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