/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {
  getCurrentFocusedBlockId,
  getCurrentFocusNodeId,
  PAUSE_TIME,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
} from './test_setup.js';

suite('Stack navigation', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.COMMENTS);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Next', async function () {
    await tabNavigateToWorkspace(this.browser);
    chai.assert.equal(
      'p5_setup_1',
      await getCurrentFocusedBlockId(this.browser),
    );
    await this.browser.keys('n');
    chai.assert.equal(
      'p5_draw_1',
      await getCurrentFocusedBlockId(this.browser),
    );
    await this.browser.keys('n');
    chai.assert.equal(
      'workspace_comment_1',
      await getCurrentFocusNodeId(this.browser),
    );
    await this.browser.keys('n');
    // Looped around.
    chai.assert.equal(
      'p5_setup_1',
      await getCurrentFocusedBlockId(this.browser),
    );
  });

  test('Previous', async function () {
    await tabNavigateToWorkspace(this.browser);
    chai.assert.equal(
      'p5_setup_1',
      await getCurrentFocusedBlockId(this.browser),
    );
    await this.browser.keys('b');
    // Looped to bottom.
    chai.assert.equal(
      'workspace_comment_1',
      await getCurrentFocusNodeId(this.browser),
    );
    await this.browser.keys('b');
    chai.assert.equal(
      'p5_draw_1',
      await getCurrentFocusedBlockId(this.browser),
    );
    await this.browser.keys('b');
    chai.assert.equal(
      'p5_setup_1',
      await getCurrentFocusedBlockId(this.browser),
    );
  });
});
