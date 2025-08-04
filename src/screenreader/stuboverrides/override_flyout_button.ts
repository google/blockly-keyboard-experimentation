/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (flyoutButton) => {
    const element = flyoutButton.getFocusableElement();
    aria.setRole(element, aria.Role.BUTTON);
    aria.setState(element, aria.State.LABEL, 'Button');
  },
  // @ts-expect-error Access to private property updateTransform.
  Blockly.FlyoutButton.prototype.updateTransform,
  Blockly.FlyoutButton.prototype,
);
