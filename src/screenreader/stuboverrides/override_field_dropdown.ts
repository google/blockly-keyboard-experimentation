/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (fieldDropdown) => {
    const element = fieldDropdown.getFocusableElement();
    aria.setRole(element, aria.Role.LISTBOX);
    aria.setState(
      element,
      aria.State.LABEL,
      fieldDropdown.name ? `Item ${fieldDropdown.name}` : 'Item',
    );
  },
  'initView',
  Blockly.FieldDropdown.prototype,
);
