const _ = require('lodash');
const CanvasElement = require('./CanvasElement');
const CanvasUtil = require('./CanvasUtil');

/**
 * This is what is passed into a users CanvasFactory function(Their render function).
 * This will contain inerfacing methods for users use.
 */
class CanvasBuilder {
    constructor(canvas)
    {
        this.bindMethods.bind(this)();
        this.canvas = canvas;
        this.blackListedSchemas = [];
        // easy access to user.
        this.property = this.canvas.property;
    }

    bindMethods()
    {
        this.clear = this.clear.bind(this);
        this.prompt = this.prompt.bind(this);
        this.write = this.write.bind(this);
        this.model = this.model.bind(this);
        this.reDraw = this.reDraw.bind(this);
        this.drawCount = this.drawCount.bind(this);
        this.event = this.event.bind(this);
        this.update = this.update.bind(this);
        this.value = this.value.bind(this);
        this.clearScreen = this.clearScreen.bind(this);
        this.set = this.set.bind(this);
        this.once = this.once.bind(this);
        this.list = this.list.bind(this);
        this.blink = this.blink.bind(this);
        this.animation = this.animation.bind(this);
        this.isBlackListed = this.isBlackListed.bind(this);
        this.doneWith = this.doneWith.bind(this);
        this.refreshRate = this.refreshRate.bind(this);
        this.loopUntil = this.loopUntil.bind(this);
        this.render = this.render.bind(this);
        this.createElement = this.createElement.bind(this);
        this.deleteElement = this.deleteElement.bind(this);
        this.info = this.info.bind(this);
        this.renderWhile = this.renderWhile.bind(this);
        this.rainbow = this.rainbow.bind(this);
        this.capUnder = this.capUnder.bind(this);
    }

    /**
     * Debug function that display's canvas info.
     */
    info()
    {
        const chalk = require('chalk');
        const modelState = this.model();
        this.write(chalk.red("=-=-= Debug Stat's =-=-="));
        this.write(chalk.red(`Draw Count: ${chalk.bold(this.drawCount())}`));
        this.write(chalk.yellow("=- Current application model state -="));
        
        const values = _.values(modelState);
        const keys = _.keys(modelState);

        this.list(keys)((item, index) => {
            let val = values[index];
            const filterValue = val => {
                return val.substring(0, 40) + "...";
            };
            if(typeof val == 'string' && val.length >= 40)
                val = filterValue(val);
            else if(val instanceof Array)
                val = "Array with length: " + val.length;
            
            


            return chalk.red(item) + " : " + chalk.green( val )
        }); 

        this.write(chalk.red("=-=-= End Debug Stat's =-=-="));
        this.write(" ");
    }

    refreshRate()
    {
        return this.canvas.refreshRate;
    }

    renderWhile(doRender)
    {
        return fragment => {
            if(doRender)
                fragment(this);
        };
    }
    
    loopUntil(expressionOutput)
    {
        let el = undefined;
        return fragment => {
            if(expressionOutput)
                // return this.canvas.stopElementNextCycle(el);
                return;
            fragment(this);
            el = this.canvas.getLastElement();
            this.canvas.stopRenderOn(el);
            const { eventHandler } = this.canvas;
            eventHandler.once('after-render', () => {
                eventHandler.emit('render');
            });
        };
    }

    /**
     * Only draw the function once.
     * @param {*} funct 
     */
    once(funct)
    {
        // by the time we are ready to draw the count will be 2.
        if(this.drawCount() !== 2)
            return;
        funct();
    }

    /**
     * Will not render a schema with this name again.
     * @param {*} name 
     */
    doneWith(target)
    {
        if(!target.writeSchema)
            return;
        this.blackListedSchemas.push(target.writeSchema.name);
        
    }

    event(eventName, doEmit = false)
    {
        if(eventName && doEmit)
        {
            this.canvas.eventHandler.emit(eventName);
            return;
        }
        /**
         * @param userEventHandler the user event handler to invoke upon the target event emission
         */
        return userEventHandler => {
            this.canvas.eventHandler.once(eventName, userEventHandler);
        };
    }

    // write all lines in a array
    list(array)
    {
        return iterator => {
            _.forEach(array, (elem, index, ar) => {
                let val = iterator(elem, index, ar);
                if(val)
                    this.write(val);
            });
        }
    }

    /**
     * Create CanvasElement, 
     * add it to the render queue,
     * then return to user
     * @param {*} data 
     * @param {*} options 
     */
    write(data)
    {
        // if user simply wants to render element then they pass element
        // into write.
        if(data instanceof CanvasElement)
        {
            // user wants to simply write the element.
            if(data.writeSchema)
            {
                data.writeSchema.element = data;
                data.queueForRender();
            }
            return data;
        } else if(data instanceof Object) 
            throw new Error("you cannot write Objects please use iterators and list functions.");
            
        // data is string at this point.
        const element = this.createElement(data)(null);
        element.renderBuffer.push(data);
        element.queueForRender();
        
        
        // if user wants to tell element what to write at write time then
        // they pass string data into first function and element into next.
        return elementRef => {
            if(typeof data == 'string' && elementRef instanceof CanvasElement)
            {
                // discard of element we are constructing right now.
                element.discard();
                elementRef.renderBuffer.push(data);
                elementRef.queueForRender();
                return elementRef;
            } else if(typeof elementRef == 'string')
            {
                element.renderBuffer[0] += this.value(elementRef);
                return element;
            }
            
            // apply schema to element and queue for render.
            elementRef.element = element;
            element.writeSchema = elementRef;
            element.queueForRender();
            this.canvas.promptCount++;
            return element;
        
        };
    }

    deleteElement(element)
    {
        return element;
    }

    /**
     * Render a fragment
     */
    render(elementGenerator)
    {
        elementGenerator(this);
    }   

    /**
     * This will create an element that doesnt render until passed into write.
     * so you can do what you want with it until you wish to render.
     * 
     * @param {*} schema 
     */
    createElement(schema, ...options)
    {
        // user wants to generate a element that writes to screen.
        if(typeof schema == 'string')
        {
            const element = new CanvasElement(this.canvas);
            element.options = options;
            element.renderBuffer.push(schema);
            return writeSchema => {
                if(!writeSchema) return element;
                element.writeSchema = writeSchema;
                return element;
            };
        }
        const element = new CanvasElement(this.canvas);
        if(schema) {
            schema.element = element;
            element.writeSchema = schema;
        }
        element.options = options;
        return element;
    
    }

    /**
     * Will clear all previous output.
     */
    clear()
    {
        this.canvas.renderer.clearLines();
    }

    isBlackListed(canvasElement)
    {
        if(!canvasElement.writeSchema)
            return false;
        for(const name of this.blackListedSchemas)
            if(name == canvasElement.writeSchema.name) 
                return true;
        return false;
    }

    /**
     * Will create a prompt schema
     * @param {*} bindTo What model key to bind to.
     */
    prompt(bindTo = "")
    {
        const writeSchema = {};
        writeSchema.name = bindTo;
        writeSchema.type = 'prompt';
        return (...properties) => {
            // define object to merge.
            writeSchema.options = this.canvas.compileProperties(properties);    
            return writeSchema;
        };
    }

    /**
     * Used to set and get data from the model.
     * @param {*} required 
     */
    model(...required)
    {
        // if user passes nothing then return the current state of model.
        if(required.length == 0)
            return this.canvas.model;

        // invoke user factory when the model contains the required values.
        return (factory, fallback) => {
            // User is setting the model to the value of factory.
            if(required.length == 1 && !factory && !fallback && !(factory instanceof Function))
            {
                // pull value off the model
                const value = this.canvas.model[required[0]];
                return value ? value : "";
            }
            else if(required.length == 1 && !(factory instanceof Function))
                return this.canvas.updateModelValue(this.canvas.property(required[0], !factory ? "hello" : factory), fallback);
            
            
            // user wants to invoke a factory function if all values exist.
            const returnBuffer = {};
            // iterate through the required values.
            required.forEach(key => {
                // check if model contains keys.
                if(this.canvas.model[key])
                    returnBuffer[key] = this.canvas.model[key];
                
            });
            // if the return buffer size is equal to the required value size(meaning found all values) then run the user factory with the returnBuffer.
            if(_.size(returnBuffer) == required.length)
            {
                if(factory) factory(returnBuffer);
                return returnBuffer;
            } // if not all required values are present the render a fallback.
            else {
                if(fallback) fallback();
                return returnBuffer;
            }
        };  
    }

    set(name)
    {
        return (value, dontUpdate = true) => {
            return this.canvas.updateModelValue(this.property(name, value), dontUpdate);
        }
    }

    value(name)
    {
        return this.model(name)();
    }

    /**
     * Will merge the supplied value into model value assuming it exists.
     * @param {*} name 
     */
    update(name)
    {
        const val = this.value(name);
        if(val && !(val instanceof String))
        return (newValue, ...properties) => {
            if(val instanceof Array)
            {
                val.push(newValue);
                return this.set(name)(val, true);
            }
            else if (value instanceof Object)
                return this.set(name)(_.merge(val, newValue), true);
            else 
                return this.set(name)(val + newValue, true);
        };
    }

    /**
     * This is a fun function people can use.
     * This is middleware for a animation schema.
     * it will animate the text by making big and small letters
     * and pulsing a rainbow left to right.
     */
    rainbow(frameNumber, prefix, frame, state)
    {
        const grad = require('gradient-string');
        const binding = [
            grad('pink', 'cyan', 'blue', 'green'), 
            grad('magenta', 'blue', 'green', 'grey'),
            grad('magenta', 'cyan', 'link', 'yellow'),
            grad('yellow', 'pink', 'blue', 'green')
        ];
        const rand = () => Math.floor(Math.random() * ((binding.length - 1) - 0 + 1)) + 0;
        return { prefix: binding[rand()](prefix), frame: binding[rand()](frame), state };
    }

    /**
     * Blinking animation middleware
     * @param {*} frameNumber 
     * @param {*} prefix 
     * @param {*} frame 
     * @param {*} state 
     */
    blink(frameNumber, prefix, frame, state)
    {
        if(frame == 0)
            state.blink = true;
        state.blink = !state.blink;
        return {
            prefix: state.blink ? prefix : "",
            frame: state.blink ? frame : "",
            state
        };
    }

    /**
     * Animaton middleware for randomly converting from upper case to lower case umpaloompa style.
     * @param {} frameNumber 
     * @param {*} prefix 
     * @param {*} frame 
     * @param {*} state 
     */
    capUnder(frameNumber, prefix, frame, state)
    {
        prefix = prefix.split("").map(letter => Math.random() >= 0.5 ? letter.toLowerCase() : letter.toUpperCase() ).join("");
        return { prefix, frame, state };
    }

    /**
     * this will stop everything from rendering until the animation frames finish rendering.
     * @param baseText the next to always be rendered at beginning.
     * @param interval the interval between frames.
     * @param properties the extra properties.
     */
    animation(interval, ...middleware)
    {
        const writeSchema = {};
        writeSchema.interval = interval;
        writeSchema.middleware = !middleware ? [(frameNumber, prefix, frame) => prefix + frame] : middleware;
        writeSchema.type = 'animation';
        return (...frames) => {
            // right now the system only supports frame based animations. in future we will support multi line frames via multi dimensional arrays
            // and we will support gif's / array of png or jpg images.
            writeSchema.frames = frames;
            return writeSchema;
        }
    }
    
    

    /**
     * Clear the whole console window.
     */
    clearScreen()
    {
        this.canvas.renderer.clearWindow();
    }


    drawCount()
    {
        return this.canvas.drawCount;
    }

    /**
     * Will redraw the canvas.
     * @param {*} waitFor wait for how many seconds
     */
    reDraw(waitFor = 0)
    {
        //setTimeout(() => this.canvas.eventHandler.emit('render'), waitFor);
        throw new Error("reDraw is now deprecated due to new render implementation. there is simply no need for it now.");
    }

}
module.exports = CanvasBuilder;