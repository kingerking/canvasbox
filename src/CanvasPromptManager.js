
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
    }

    /**
     * Called upon finishing a prompt.
     * @param {*} prompt The prompt to mark as done.
     */
    finish(prompt)
    {
        this.finishedPrompts.push(prompt);
    }

    reset()
    {

    }

    /**
     * Will return true if this is a new prompt or is the current prompt that hasnt been forfilled(is to be the focused prompt).
     * Will reutrn false if the prompt has been forfilled(user has submitted it).
     */
    isCurrent(prompt)
    {
        for(const promptSchema of this.finishedPrompts)
            if(promptSchema == prompt)
            {
                console.log('prompt dont finished: ', prompt.name)
                return false;
            }
        return true;
    }

}
module.exports = CanvasPromptAccessManager;