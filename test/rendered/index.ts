/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
// Import the default blocks.
import * as libraryBlocks from 'blockly/blocks';
import {installAllBlocks as installColourBlocks} from '@blockly/field-colour';
import {KeyboardNavigation} from '../../src/index';
// @ts-expect-error No types in js file
import {forBlock} from './blocks/p5_generators';
// @ts-expect-error No types in js file
import {blocks} from './blocks/p5_blocks';
// @ts-expect-error No types in js file
import {toolbox as toolboxFlyout} from './blocks/toolbox.js';
// @ts-expect-error No types in js file
import toolboxCategories from './toolboxCategories.js';

import {javascriptGenerator} from 'blockly/javascript';
// @ts-expect-error No types in js file
import {load} from '../loadTestBlocks';

/**
 * Parse query params for inject and navigation options and update
 * the fields on the options form to match.
 *
 * @returns An options object with keys for each supported option.
 */
function getOptions() {
  const params = new URLSearchParams(window.location.search);

  const scenarioParam = params.get('scenario');
  const scenario = scenarioParam ?? 'simpleCircle';

  const rendererParam = params.get('renderer');
  let renderer = 'zelos';
  // For backwards compatibility with previous behaviour, support
  // (e.g.) ?geras as well as ?renderer=geras:
  if (rendererParam) {
    renderer = rendererParam;
  } else if (params.get('geras')) {
    renderer = 'geras';
  } else if (params.get('thrasos')) {
    renderer = 'thrasos';
  }

  const noStackParam = params.get('noStack');
  const stackConnections = !noStackParam;

  const toolboxParam = params.get('toolbox');
  const toolbox = toolboxParam ?? 'toolbox';
  const toolboxObject =
    toolbox === 'flyout' ? toolboxFlyout : toolboxCategories;

  // Update form inputs to match params, but only after the page is
  // fully loaded as Chrome (at least) tries to restore previous form
  // values and does so _after_ DOMContentLoaded has fired, which can
  // result in the form inputs being out-of-sync with the actual
  // options when doing browswer page navigation.
  window.addEventListener('load', () => {
    (document.getElementById('toolbox') as HTMLSelectElement).value = toolbox;
    (document.getElementById('renderer') as HTMLSelectElement).value = renderer;
    (document.getElementById('scenario') as HTMLSelectElement).value = scenario;
    (document.getElementById('noStack') as HTMLInputElement).checked =
      !stackConnections;
  });

  return {
    scenario,
    stackConnections,
    renderer,
    toolbox: toolboxObject,
  };
}

/**
 * Create the workspace, including installing keyboard navigation and
 * change listeners.
 *
 * @returns The created workspace.
 */
function createWorkspace(): Blockly.WorkspaceSvg {
  const {scenario, stackConnections, renderer, toolbox} = getOptions();

  const injectOptions = {
    toolbox,
    renderer,
  };
  const blocklyDiv = document.getElementById('blocklyDiv')!;
  const workspace = Blockly.inject(blocklyDiv, injectOptions);

  const navigationOptions = {
    cursor: {stackConnections},
  };
  new KeyboardNavigation(workspace, navigationOptions);

  // Disable blocks that aren't inside the setup or draw loops.
  workspace.addChangeListener(Blockly.Events.disableOrphans);

  load(workspace, scenario);

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

document.addEventListener('DOMContentLoaded', () => {
  addP5();
  console.log('proof of life');
  createWorkspace();
});