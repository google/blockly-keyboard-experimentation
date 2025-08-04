/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (icon) => {
    const element = icon.getFocusableElement();
    aria.setRole(element, aria.Role.FIGURE);
    aria.setState(element, aria.State.LABEL, 'Icon');
  },
  Blockly.icons.Icon.prototype.initView,
  Blockly.icons.Icon.prototype,
);
