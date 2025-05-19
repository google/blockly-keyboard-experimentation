/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {Browser, Key} from 'webdriverio';
import {
  getFocusedBlockType,
  PAUSE_TIME,
  setCurrentCursorNodeById,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
} from './test_setup.js';

suite('Move tests', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.MOVE_TEST_BLOCKS);
    await this.browser.pause(PAUSE_TIME);
  });
});
