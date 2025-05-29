/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateForward,
  getFocusedBlockType,
  keyDown,
  tabNavigateBackward,
  tabNavigateToWorkspace,
  keyRight,
} from './test_setup.js';

suite.only('Toolbox and flyout test', function () {
  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Tab navigating to toolbox should open flyout', async function () {
    // Two tabs should navigate to the toolbox (initial element is skipped).
    await tabNavigateForward(this.browser);

    await tabNavigateForward(this.browser);

    // The flyout should now be open.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isTrue(flyoutIsOpen);
  });

  test('Tab navigating to flyout should auto-select first block', async function () {
    // Three tabs should navigate to the flyout (initial element is skipped).
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await tabNavigateForward(this.browser);

    // The top block of the category should be automatically selected. See:
    // https://github.com/google/blockly/issues/8978.
    const blockType = await getFocusedBlockType(this.browser);
    chai.assert.strictEqual(blockType, 'controls_if');
  });

  test('Tab navigating to toolbox then right arrow key should auto-select first block in flyout', async function () {
    // Two tabs should navigate to the toolbox (initial element is skipped). One
    // right arrow key should select a block on the flyout.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await keyRight(this.browser);

    // The top block of the category should be automatically selected. See:
    // https://github.com/google/blockly/issues/8978.
    const blockType = await getFocusedBlockType(this.browser);
    chai.assert.strictEqual(blockType, 'controls_if');
  });

  test('Keyboard nav to different toolbox category should auto-select first block', async function () {
    // Two tabs should navigate to the toolbox (initial element is skipped),
    // then keys for a different category with a tab to select the flyout.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await keyDown(this.browser, 3);
    await tabNavigateForward(this.browser);

    // The top block of the category should be automatically selected.
    const blockType = await getFocusedBlockType(this.browser);
    chai.assert.strictEqual(blockType, 'text');
  });

  test('Keyboard nav to different toolbox category and block should select different block', async function () {
    // Two tabs should navigate to the toolbox (initial element is skipped),
    // then keys for a different category with a tab to select the flyout and
    // finally keys to select a different block.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await keyDown(this.browser, 3);
    await tabNavigateForward(this.browser);
    await keyDown(this.browser, 2);

    // A non-top blockshould be manually selected.
    const blockType = await getFocusedBlockType(this.browser);
    chai.assert.strictEqual(blockType, 'text_append');
  });

  test('Tab navigate away from toolbox restores focus to initial element', async function () {
    // Two tabs should navigate to the toolbox. One tab back should leave it.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await tabNavigateBackward(this.browser);

    // Focus should restore to the initial div element. See:
    // https://github.com/google/blockly-keyboard-experimentation/issues/523.
    const activeElementId = await this.browser.execute(
      () => document.activeElement?.id);
    chai.assert.strictEqual(activeElementId, 'focusableDiv');
  });

  test('Tab navigate away from toolbox closes flyout', async function () {
    // Two tabs should navigate to the toolbox. One tab back should leave it.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await tabNavigateBackward(this.browser);

    // The flyout should be closed since the toolbox lost focus. See:
    // https://github.com/google/blockly/issues/8970.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });

  test('Tab navigate away from flyout to toolbox and away closes flyout', async function () {
    // Three tabs should navigate to the flyout, and two tabs back should close.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await tabNavigateBackward(this.browser);
    await tabNavigateBackward(this.browser);

    // The flyout should be closed since the toolbox lost focus.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });

  test('Tabbing to the workspace should close the flyout', async function () {
    await tabNavigateToWorkspace(this.browser);

    // The flyout should be closed since it lost focus.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });

  test('Tabbing to the workspace after selecting flyout block should close the flyout', async function () {
    // Two tabs should navigate to the toolbox (initial element is skipped),
    // then use right key to specifically navigate into the flyout before
    // navigating to the workspace.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    await keyRight(this.browser);
    await tabNavigateForward(this.browser);

    // The flyout should be closed since it lost focus. See:
    // https://github.com/google/blockly-keyboard-experimentation/issues/547.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });

  test('Tabbing to the workspace after selecting flyout block via workspace toolbox shortcut should close the flyout', async function () {
    await tabNavigateToWorkspace(this.browser);

    await this.browser.keys('t');
    await keyRight(this.browser);
    await tabNavigateForward(this.browser);

    // The flyout should now be closed and unfocused. See:
    // https://github.com/google/blockly/pull/9079#issuecomment-2913759646.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });

  test('Tabbing back from workspace should reopen the flyout', async function () {
    await tabNavigateToWorkspace(this.browser);

    await tabNavigateBackward(this.browser);

    // The flyout should be open again since the toolbox is again focused. See:
    // https://github.com/google/blockly/issues/8965.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isTrue(flyoutIsOpen);
  });

  test('Navigation position in workspace should be retained when tabbing to flyout and back', async function () {
    // Navigate to the workspace and select a non-default block.
    await tabNavigateToWorkspace(this.browser);

    // Note that two tabs are needed here to move past the flyout.
    await keyDown(this.browser, 3);
    await tabNavigateBackward(this.browser);
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    // The previously selected block should be retained upon returning. See:
    // https://github.com/google/blockly/issues/8965#issuecomment-2900479280.
    const blockType = await getFocusedBlockType(this.browser);
    chai.assert.strictEqual(blockType, 'p5_draw');
  });

  test('Clicking outside Blockly with focused toolbox closes the flyout', async function () {
    // Two tabs should navigate to the toolbox. One click to unfocus.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);

    const elem = this.browser.$('#focusableDiv');
    await elem.click();

    // The flyout should be closed due to clicking an outside element.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });

  test('Clicking outside Blockly with focused flyout closes the flyout', async function () {
    // Two tabs should navigate to the toolbox. One key to select the flyout.
    await tabNavigateForward(this.browser);
    await tabNavigateForward(this.browser);
    await keyRight(this.browser);

    const elem = this.browser.$('#focusableDiv');
    await elem.click();

    // The flyout should be closed due to clicking an outside element. See:
    // https://github.com/google/blockly/pull/9079#issuecomment-2914628810.
    const flyoutIsOpen = await checkIfFlyoutIsOpen(this.browser);
    chai.assert.isFalse(flyoutIsOpen);
  });
});

async function checkIfFlyoutIsOpen(
  browser: WebdriverIO.Browser,
): Promise<boolean> {
  return await browser.execute(() => {
    const workspaceSvg = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const flyout = workspaceSvg.getFlyout();
    if (!flyout) throw new Error('Workspace has no flyout.');
    return flyout.isVisible();
  });
}
