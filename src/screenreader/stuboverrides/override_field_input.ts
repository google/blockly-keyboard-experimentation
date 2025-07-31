import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

// Note: These can be consolidated to FieldInput, but that's not exported so it
// has to be overwritten on a per-field basis.
FunctionStubber.getInstance().registerInitializationStub(
  (fieldNumber) => {
    initializeFieldInput(fieldNumber);
  },
  'init',
  Blockly.FieldNumber.prototype,
);

FunctionStubber.getInstance().registerInitializationStub(
  (fieldTextInput) => {
    initializeFieldInput(fieldTextInput);
  },
  'init',
  Blockly.FieldTextInput.prototype,
);

function initializeFieldInput(
  fieldInput: Blockly.FieldNumber | Blockly.FieldTextInput,
): void {
  const element = fieldInput.getFocusableElement();
  aria.setRole(element, aria.Role.TEXTBOX);
  aria.setState(
    element,
    aria.State.LABEL,
    fieldInput.name ? `Text ${fieldInput.name}` : 'Text',
  );
}
