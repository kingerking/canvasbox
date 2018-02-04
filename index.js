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
        this.promptBuffer = {};
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
        // this.promptBuffer = {};
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
                this.promptBuffer[line.prompt.name] = await Prompt(line.baseContents);
                this.eventHandler.emit('prompt-finish', returnValue, line.prompt, line);
                this.eventHandler.emit('prompt-buffer-update', 
                    { name: line.prompt.name, value: this.promptBuffer[line.prompt.name] });
                // resetCursor();
                // readline.moveCursor(process.stdout, 0, -(this.lines.indexOf(line)));
                // readline.clearLine(process.stdout);
                // // clear current prompt then write a fake one.
                // process.stdout.write(line.baseContents + "\n");
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
            require: searchFor => {
                // if user passes array of required values then return a Object, else just the value
                const objectReturnModel = searchFor instanceof Array;
                const query = objectReturnModel ? searchFor : [searchFor];
                
                // user runs this function
                const promiseBuilder = () => new Promise(resolve => {

                });
                return promiseBuilder;
            },
            value: queryFor => {
                const buffer = this.promptBuffer;
                console.log('current buffer state: ', buffer);
                return "<Could not find>";
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