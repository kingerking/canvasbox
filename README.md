# Canvas IO
- **The be all and end all of advanced console output scenarios.**
- **A Canvas utility for node.js, manage Prompts, Template with ease(Dynamic output), create advanced Forms and utility's with a beautifully designed Api.**
- **Same premies of input-promptify except better in every way.**
###Some simple projects you can easily write using Canvas Box
- Real time chat application.
- Real time Analytics readout.
- Real time Folder searching utility. 
- ASCII animation engine.
- Administration tool.
- Sexy RestAPI client.

###Features
- Full fledge event driven rendering pipeline.
- 100% asynchronous in nature.
- Promise based rendering.
- Easy to use, simple but versatile Api.
- Text prompts.
- Animations
- tones of canvas writing utilities.

###Features coming soon
- Selection Prompts.
- Multi Selectable Prompts.
- More events.
- text fields(multi line prompts)

## Usage

###### installation and importing
install using with npm
```
npm i -s canvas.io
```
or with yarn
```
yarn add canvas.io
```
All examples assumes you have canvas IO imported as Canvas
```
const Canvas = require("canvas.io");
```
###### Basic canvas
```
Canvas(canvas => {
    canvas.clear();
    canvas.write("Hello world!");
});
```
This will simply render Hello world to the screen.
##### Simple Templating
Dont want to rerun the command to see up to date info? Simple! just use a canvas as a 
template renderer.
```
let testValue = "hello world";
Canvas(canvas => {
    canvas.clear();
    canvas.write(testValue);
});
setTimeout(() => {
    testValue = "Some other value";
}, 1000);
```
Note that when rendering variables not held in the canvas model can cause delayed re-rendering in some cases due to fact that Canvas IO's rendering pipeline uses timeout's with varying intervals based on what is being rendered on screen. For example a canvas simply rendering text may only render once a second(unless events instruct otherwise) while canvas's rendering prompt's and schemas of all kinds may re-render at a rate of 1000 / 15. 
##### Lists
```
Canvas(canvas => {
    canvas.clear();
    
    canvas.event('init')(() => {
        canvas.set('testList')([
            "Item",
            "Item",
            "Item"
        ]);
    });

    canvas.list(canvas.value('testList))((line, index) => `${line} ${index}`);

});
/**
    expected output:
    Item 0
    Item 1
    Item 2
/*
```
##### Animations
Simple animation of a funny face that changes colors and frames(To write the colors we will use chalk).
```
Canvas(canvas => {
    canvas.clear();
    canvas.write("Loading ")( canvas.animation(500)(chalk.red('o_0'), chalk.green('0_o)) );
});
```
```
In millseconds how long to wait to render next frame
                  |                 frames
                  V                    V
canvas.animation(500)(chalk.red('o_0'), chalk.green('0_o))
```
**Note that when rendering animations they must be passed into whats called a writeSchema(The function that canvas.write() returns), If you simple call canvas.animation()() it will only return a animation write schema**