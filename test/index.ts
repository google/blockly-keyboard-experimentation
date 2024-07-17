/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {installAllBlocks as installColourBlocks} from '@blockly/field-colour';
import {createPlayground} from '@blockly/dev-tools';
import {KeyboardNavigation} from '../src/index';
// @ts-expect-error No types in js file
import {forBlock} from '../src/blocks/p5_generators';
// @ts-expect-error No types in js file
import {blocks} from '../src/blocks/p5_blocks';
// @ts-expect-error No types in js file
import {toolbox} from '../src/blocks/toolbox.js';

import p5 from 'p5';
import {javascriptGenerator} from 'blockly/javascript';
// @ts-expect-error No types in js file
import {save, load} from './serialization';

const runCode = () => {
  const code = javascriptGenerator.workspaceToCode(Blockly.getMainWorkspace());
  const p5outputDiv = document.getElementById('p5output');
  if (p5outputDiv) {
    // Clear the old canvas.
    p5outputDiv.innerHTML = '';
    // Run P5 in instance mode. The name 'sketch' matches the name used
    // in the generator for all of the p5 blocks.
    // eslint-disable-next-line new-cap
    new p5((sketch) => {
      console.log(sketch);
      eval(code);
    }, p5outputDiv);
  }
};

/**
 * Create a workspace.
 *
 * @param blocklyDiv The blockly container div.
 * @param options The Blockly options.
 * @returns The created workspace.
 */
function createWorkspace(
  blocklyDiv: HTMLElement,
  options: Blockly.BlocklyOptions,
): Blockly.WorkspaceSvg {
  const workspace = Blockly.inject(blocklyDiv, options);

  const plugin = new KeyboardNavigation(workspace);

  // Disable blocks that aren't inside the setup or draw loops.
  workspace.addChangeListener(Blockly.Events.disableOrphans);

  // Load the initial state from storage and run the code.
  load(workspace);
  runCode();

  // Every time the workspace changes state, save the changes to storage.
  workspace.addChangeListener((e) => {
    // UI events are things like scrolling, zooming, etc.
    // No need to save after one of these.
    if (e.isUiEvent) return;
    save(workspace);
  });

  return workspace;
}

function addP5() {
  // Installs all four blocks, the colour field, and all language generators.
  installColourBlocks({
    javascript: javascriptGenerator,
  });
  Blockly.common.defineBlocks(blocks);
  Object.assign(javascriptGenerator.forBlock, forBlock);
  javascriptGenerator.addReservedWords('sketch');
}

function setOptionsDefaultCollapsed() {
  const key = 'playgroundState_@blockly/keyboard-experiment';
  const state = localStorage.getItem(key);
  if (state === null) {
    localStorage.setItem(
      key,
      JSON.stringify({
        activeTab: 'JSON',
        // This is the thing we're actually changing.
        playgroundOpen: false,
        autoGenerate: true,
        workspaceJson: '',
      }),
    );
  }
}

document.addEventListener('DOMContentLoaded', function () {
  addP5();
  setOptionsDefaultCollapsed();
  const defaultOptions = {
    toolbox: toolbox,
  };

  createPlayground(
    document.getElementById('root')!,
    createWorkspace,
    defaultOptions,
  );
  document.getElementById('run')?.addEventListener('click', runCode);
});
