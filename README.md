# Blockly Keyboard Experimentation

This plugin for Blockly enables keyboard navigation. It is intended to
experiment with different actions that might help visually impaired and motor
impaired people navigate a Blockly workspace.

You can explore the current state of the plugin on the [test page](https://google.github.io/blockly-keyboard-experimentation/).

There is also an [existing keyboard navigation plugin](https://www.npmjs.com/package/@blockly/keyboard-navigation). That plugin may be where
a finalized version of keyboard navigation eventually lives. But for now, this
is where experimentation will be done.

## Testing in your app

### Installation

#### Yarn

```
yarn add @blockly/keyboard-experiment
```

#### npm

```
npm install @blockly/keyboard-experiment --save
```

### Usage

```js
import * as Blockly from 'blockly';
import {KeyboardNavigation} from '@blockly/keyboard-experiment';
// Inject Blockly.
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolboxCategories,
});
// Initialize plugin.
const keyboardNav = new KeyboardNavigation(workspace);
```

## Contributing

To learn more about contributing to this project, see the [contributing page](https://github.com/google/blockly-keyboard-experimentation/blob/main/CONTRIBUTING.md).
