const _ = require('lodash');
class Util {
    constructor(canvas)
    {
        this.canvas = canvas;
    }

    /**
     * Will parse all properties then return a properly filtered array / object.
     * @param {*} collection Array(Objects will be supported in future.)
     * @param {*} properties the props to parse and implement into the array.
     */
    filterWithProperties(collection, properties)
    {
        const options = this.canvas.compileProperties(properties);
        const origCol = collection;

        const handleOverflow = amount => {
            if(collection.length >= amount && options.overflowDelete && (options.overflowDelete == 'start' || options.overflowDelete == 'end'))
            {
                if(options.overflowDelete == 'start')
                    collection.shift();
                else 
                    collection.pop();
            }
        };

        const fillCollection = fillWith => {
            // dont fill a already set buffer.
            
            // if(origCol.length !== 0) return;
            for(let i = 0; i <= (options.overflow + 1); i++)
                collection.push(fillWith);
        };

        if(options.overflow)
            handleOverflow(options.overflow);
        if(options.prefill && options.overflow && options.overflowDelete)
            fillCollection(options.prefill);
        
        return collection;
    }
}

module.exports = Util;