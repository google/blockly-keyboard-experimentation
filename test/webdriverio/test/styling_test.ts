/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Key} from 'webdriverio';
import {
  focusOnBlock,
  keyDown,
  keyRight,
  PAUSE_TIME,
  sendKeyAndWait,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
} from './test_setup.js';
import * as chai from 'chai';

suite('Styling test', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  async function strokeColorEquals(
    browser: WebdriverIO.Browser,
    selector: string,
    color: string,
  ): Promise<boolean> {
    const stroke = (await browser.$(selector).getCSSProperty('stroke')).value;
    chai.assert.include(['none', color], stroke);
    return stroke === color;
  }

  async function workspaceHasActiveTreeStyle(
    browser: WebdriverIO.Browser,
  ): Promise<boolean> {
    return strokeColorEquals(
      browser,
      '.blocklyWorkspaceFocusRing',
      'rgb(96,165,250)',
    );
  }

  async function workspaceHasActiveNodeStyle(
    browser: WebdriverIO.Browser,
  ): Promise<boolean> {
    return strokeColorEquals(
      browser,
      '.blocklyWorkspaceSelectionRing',
      'rgb(255,242,0)',
    );
  }

  test('Workspace has no ring styles when not focused', async function () {
    chai.assert.isFalse(await workspaceHasActiveTreeStyle(this.browser));
    chai.assert.isFalse(await workspaceHasActiveNodeStyle(this.browser));
  });

  test('Workspace has only active tree style when block selected', async function () {
    await tabNavigateToWorkspace(this.browser);
    chai.assert.isFalse(await workspaceHasActiveTreeStyle(this.browser));
    // Trigger keyboard mode.
    await keyDown(this.browser);

    chai.assert.isTrue(await workspaceHasActiveTreeStyle(this.browser));
    chai.assert.isFalse(await workspaceHasActiveNodeStyle(this.browser));
  });

  test('Workspace has active tree and active node style when workspace selected', async function () {
    await tabNavigateToWorkspace(this.browser);
    await sendKeyAndWait(this.browser, 'w');

    chai.assert.isTrue(await workspaceHasActiveTreeStyle(this.browser));
    chai.assert.isTrue(await workspaceHasActiveNodeStyle(this.browser));
  });

  test('Workspace has only active tree style when move is in progress', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'set_background_color_1');
    // Moves block to drag layer which requires different selectors.
    await sendKeyAndWait(this.browser, 'm');

    chai.assert.isTrue(await workspaceHasActiveTreeStyle(this.browser));
    chai.assert.isFalse(await workspaceHasActiveNodeStyle(this.browser));
  });

  test('Workspace has only active tree style when widget has focus', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'create_canvas_1');
    // Move to field.
    await keyRight(this.browser);
    // Enter moves focus to the widget div.
    await sendKeyAndWait(this.browser, Key.Enter);

    chai.assert.isTrue(await workspaceHasActiveTreeStyle(this.browser));
    chai.assert.isFalse(await workspaceHasActiveNodeStyle(this.browser));
  });

  test('Workspace has only active tree style when dropdown has focus', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'set_background_color_1');
    // Move to color block.
    await keyRight(this.browser);
    // Enter moves focus to the dropdown div.
    await sendKeyAndWait(this.browser, Key.Enter);

    chai.assert.isTrue(await workspaceHasActiveTreeStyle(this.browser));
    chai.assert.isFalse(await workspaceHasActiveNodeStyle(this.browser));
  });
});
