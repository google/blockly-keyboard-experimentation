/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
// Import the default blocks.
import * as libraryBlocks from 'blockly/blocks';
import {installAllBlocks as installColourBlocks} from '@blockly/field-colour';
import {KeyboardNavigation} from '../src/index';
// @ts-expect-error No types in js file
import {forBlock} from './blocks/p5_generators';
// @ts-expect-error No types in js file
import {blocks} from './blocks/p5_blocks';
// @ts-expect-error No types in js file
import {toolbox} from './blocks/toolbox.js';
// @ts-expect-error No types in js file
import toolboxCategories from './toolboxCategories.js';

import {javascriptGenerator} from 'blockly/javascript';
// @ts-expect-error No types in js file
import {load} from './loadTestBlocks';
import {runCode, registerRunCodeShortcut} from './runCode';

/**
 * Load initial workspace state based on the value in the scenario dropdown.
 *
 * @param workspace The workspace to load blocks into.
 */
function loadScenario(workspace: Blockly.WorkspaceSvg) {
  const scenarioSelector = location.search.match(/scenario=([^&]+)/);
  // Default to the sunny day example.
  const scenarioString = scenarioSelector
    ? scenarioSelector[1]
    : 'simpleCircle';
  const selector = document.getElementById(
    'scenarioSelect',
  ) as HTMLSelectElement;
  selector.value = scenarioString;

  // Load the initial state from storage and run the code.
  load(workspace, scenarioString);
}

/**
 * Create the workspace, including installing keyboard navigation and
 * change listeners.
 *
 * @returns The created workspace.
 */
function createWorkspace(): Blockly.WorkspaceSvg {
  console.log(location.search);
  const renderer = location.search.includes('geras')
    ? 'geras'
    : location.search.includes('thrasos')
      ? 'thrasos'
      : 'zelos';
  const options = {
    toolbox: toolboxCategories,
    renderer,
  };
  const blocklyDiv = document.getElementById('blocklyDiv')!;
  const workspace = Blockly.inject(blocklyDiv, options);

  new KeyboardNavigation(workspace, {});
  registerRunCodeShortcut();

  // Disable blocks that aren't inside the setup or draw loops.
  workspace.addChangeListener(Blockly.Events.disableOrphans);

  loadScenario(workspace);
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
