/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {toolboxCategories, createPlayground} from '@blockly/dev-tools';
import {KeyboardNavigation} from '../src/index';

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

  return workspace;
}

function setOptionsDefaultCollapsed() {
  const key = 'playgroundState_@blockly/keyboard-experiment';
  let state = localStorage.getItem(key);
  if (state === null) {
    localStorage.setItem(key, JSON.stringify({
      activeTab: 'JSON',
      // This is the thing we're actually changing.
      playgroundOpen: false,
      autoGenerate: true,
      workspaceJson: '',
    }));
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setOptionsDefaultCollapsed();
  const defaultOptions = {
    toolbox: toolboxCategories,
  };
  createPlayground(
    document.getElementById('root')!,
    createWorkspace,
    defaultOptions,
  );
});
