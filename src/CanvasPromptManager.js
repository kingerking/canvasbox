const _ = require('lodash');
/**
 * Will manage current prompts and what values they have returned.
 */
class CanvasPromptAccessManager
{
    constructor(canvas)
    {
        this.bindMethods.bind(this)();
        this.canvas = canvas;

        this.finishedPrompts = [];


    }

    bindMethods() 
    {   
        this.reset = this.reset.bind(this);
        this.isCurrent = this.isCurrent.bind(this);
        this.finish = this.finish.bind(this);
        this.checkFinished = this.checkFinished.bind(this);
    }

    /**
     * Called upon finishing a prompt.
     * @param {*} prompt The prompt to mark as done.
     */
    finish(prompt)
    {
        if(this.finishedPrompts.indexOf(prompt) == -1)
        {
            if(prompt.options.submit)
                prompt.options.submit(prompt, this.canvas.builder.value(prompt.name));
            this.finishedPrompts.push(prompt);
        }
        this.checkFinished(prompt.options);
    }

    /**
     * Reset the finished prompts.
     */
    reset()
    {
        this.finishedPrompts = [];
    }
    
    /**
     * Will reset finished prompts if all have been finished
     */
    checkFinished()
    {
        // if user finished all prompts reset to first prompt.
        if(this.finishedPrompts.length >= this.canvas.promptCount)
        {
            // get the required values to delete from the model.
            const requiredModelProperties = _.map(this.finishedPrompts, schema => schema.name);
            // reset the prompts
            this.reset();
            // re-set model values without rendering
            _.forEach(requiredModelProperties, propertyKey => {
                // if user wants this to be a one use route then dont delete its value.
                if(!this.canvas.builder.isBlackListed(propertyKey)) 
                    this.canvas.updateModelValue(this.canvas.property(propertyKey, ""), true);
            });
            
        }
    }

    /**
     * Will return true if this is a new prompt or is the current prompt that hasnt been forfilled(is to be the focused prompt).
     * Will reutrn false if the prompt has been forfilled(user has submitted it).
     */
    isCurrent(prompt)
    {
        // if is finished return false
        for(const promptSchema of this.finishedPrompts)
            if(promptSchema.name == prompt.name)
                return false;
        // if not finished return true
        return true;
    }

}
module.exports = CanvasPromptAccessManager;