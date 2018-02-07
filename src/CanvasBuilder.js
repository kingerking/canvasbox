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
        // easy access to user.
        this.property = this.canvas.property;
        this.blackListedSchemas = [];
    }

    bindMethods()
    {
        this.clear = this.clear.bind(this);
        this.prompt = this.prompt.bind(this);
        this.write = this.write.bind(this);
        this.model = this.model.bind(this);
        this.forceRender = this.forceRender.bind(this);
        this.drawCount = this.drawCount.bind(this);
        this.event = this.event.bind(this);
        this.update = this.update.bind(this);
        this.value = this.value.bind(this);
        this.clearScreen = this.clearScreen.bind(this);
        this.set = this.set.bind(this);
        this.once = this.once.bind(this);
        this.list = this.list.bind(this);
        this.animation = this.animation.bind(this);
        this.append = this.append.bind(this);
        this.loopback = this.loopback.bind(this);
        this.isBlackListed = this.isBlackListed.bind(this);
        this.drop = this.drop.bind(this);
    }

    loopback(doLoopback, after = 500)
    {
        if(!doLoopback)
            return;
        this.canvas.eventHandler.once('after-render', () => {
            setTimeout(() => this.canvas.eventHandler.emit('render'), after)
        });
        this.canvas.eventHandler.emit('stop-render');
    }

    /**
     * Append data to end of an array.
     * @param {*} name 
     */
    append(name)
    {
        return data => {
            const val = this.value(name);
            val.push(data);
            this.set(name)(val);
        }
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
    drop(name)
    {
        this.blackListedSchemas.push(name);
        
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
        return middleWare => {
            _.forEach(array, (elem, index, ar) => {
                let val = middleWare(elem, index, ar);
                if(val)this.write(val);
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
    write(data = "", ...options)
    {
        // dont write if user passes a boolean override.
        if(options[0] instanceof Boolean && !options[0])
            return;
        if(data instanceof Function)
        {
            // user wants to render a fragment
            data(this);
            return;
        }
        if(!(data instanceof Array) && !(data instanceof Object))
        {
            var element = new CanvasElement(this.canvas);
            element.renderBuffer.push(data);
            element.options = options;
        }
        // if your rendering a prompt then pass the prompt schema into this.
        return schema => {
            // schema will be the iterator if your rendering a collection.
            // the value rendered will be the returned iteration
            if(data instanceof Array || data instanceof Object)
            {
                data = (new CanvasUtil(this.canvas)).filterWithProperties(data, options);
                // user wants to write a collection. 
                //as of now this will not work for schema render calls. only text.
                _.forEach(data, (item) => {
                    let elem = new CanvasElement(this.canvas);
                    elem.options = options;
                    let dataToWrite = schema(item);
                    elem.renderBuffer.push(dataToWrite ? dataToWrite : "");
                });
                return;
            }
            element.writeSchema = schema;
            if(this.isBlackListed(schema.name))
                element.writeSchema.dropped = true;
            else
                this.canvas.promptCount++;
        };
    }

    /**
     * Will clear all previous output.
     */
    clear()
    {
        this.canvas.renderer.clearLines();
    }

    isBlackListed(schemaName)
    {
        for(const name of this.blackListedSchemas)
            if(name == schemaName) return true;
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
        return (value, dontUpdate) => {
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
     * this will stop everything from rendering until the animation frames finish rendering.
     * @param baseText the next to always be rendered at beginning.
     * @param interval the interval between frames.
     * @param properties the extra properties.
     */
    animation(interval, ...properties)
    {
        const writeSchema = {};
        writeSchema.interval = interval;
        writeSchema.extra = properties;
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

    forceRender()
    {
        this.canvas.eventHandler.emit('render');
    }

}
module.exports = CanvasBuilder;