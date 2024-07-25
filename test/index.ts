/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {installAllBlocks as installColourBlocks} from '@blockly/field-colour';
import {KeyboardNavigation} from '../src/index';
// @ts-expect-error No types in js file
import {forBlock} from '../src/blocks/p5_generators';
// @ts-expect-error No types in js file
import {blocks} from '../src/blocks/p5_blocks';
// @ts-expect-error No types in js file
import {toolbox} from '../src/blocks/toolbox.js';

import {javascriptGenerator} from 'blockly/javascript';
// @ts-expect-error No types in js file
import {load} from './loadTestBlocks';
import {runCode, registerRunCodeShortcut} from './runCode';

/**
 * Create the workspace, including installing keyboard navigation and
 * change listeners.
 *
 * @returns The created workspace.
 */
function createWorkspace(): Blockly.WorkspaceSvg {
  const options = {
    toolbox: toolbox,
    renderer: 'zelos',
  };
  const blocklyDiv = document.getElementById('blocklyDiv')!;
  const workspace = Blockly.inject(blocklyDiv, options);

  new KeyboardNavigation(workspace);
  registerRunCodeShortcut();

  // Disable blocks that aren't inside the setup or draw loops.
  workspace.addChangeListener(Blockly.Events.disableOrphans);

  // Load the initial state from storage and run the code.
  load(workspace);
  runCode();

  return workspace;
}

/**
 * Install p5.js blocks and generators.
 */
function addP5() {
  // Installs all four blocks, the colour field, and all language generators.
  installColourBlocks({
    javascript: javascriptGenerator,
  });
  Blockly.common.defineBlocks(blocks);
  Object.assign(javascriptGenerator.forBlock, forBlock);
  javascriptGenerator.addReservedWords('sketch');
}

document.addEventListener('DOMContentLoaded', function () {
  addP5();
  createWorkspace();
  document.getElementById('run')?.addEventListener('click', runCode);
});
