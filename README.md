# Blockly Keyboard Experimentation

This plugin for Blockly enables keyboard navigation. It is intended to
experiment with different actions that might help visually impaired and motor
impaired people navigate a Blockly workspace.

Keyboard navigation and screenreader support are closely coupled. The Blockly
team intends to add screenreader support incrementally in Q2 and Q3 of 2025,
as we validate the general approach to navigation.

For more planning and timeline information please read the [January 29 timeline post
on the wiki](https://github.com/google/blockly-keyboard-experimentation/wiki/Jan-29-Timeline).

## End-user instructions

You can explore the current state of the plugin on the [test page](https://google.github.io/blockly-keyboard-experimentation/).

To use keyboard navigation, click on the workspace or press tab until you
reach the workspace.

Once browser focus is on the Blockly workspace, you can use arrow keys to
move a **cursor** around the workspace. You can use keyboard shortcuts to
take actions at the cursor.

For instance, you can move the cursor to a
dropdown field and press the `Enter` key to edit the field.

The available actions depend on the cursor location. For instance, if the
cursor is on a block you can copy it with `Ctrl + C`.

You can open the toolbox by pressing `T` or pressing `Tab` until the toolbox is
highlighted. Just like the workspace, you can use the arrow keys to move around
the toolbox and select a block. Pressing `Enter` will place the block at the
cursor's location on the workspace.

If you don't know which actions are available at your cursor location, you
can press `Ctrl + Enter` to open the context menu and see a list of actions.

### Giving feedback

If you use the test page and find a bug, please let us know by opening an issue
on this repository! Include information about how to reproduce the bug, what
the bad behaviour was, and what you expected it to do. The Blockly team will
triage the bug and add it to the roadmap.

### Note on @blockly/keyboard-navigation plugin

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
