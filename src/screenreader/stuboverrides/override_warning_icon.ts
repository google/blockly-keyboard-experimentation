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
    aria.setState(
      element,
      aria.State.LABEL,
      icon.bubbleIsVisible() ? 'Close Warning' : 'Open Warning',
    );
  },
  Blockly.icons.WarningIcon.prototype.initView,
  Blockly.icons.WarningIcon.prototype,
);
