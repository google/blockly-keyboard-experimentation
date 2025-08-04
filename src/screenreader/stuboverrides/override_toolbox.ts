/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (toolbox) => {
    aria.setRole(toolbox.getFocusableElement(), aria.Role.TREE);
  },
  'init',
  Blockly.Toolbox.prototype,
);
