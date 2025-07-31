import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub((fieldCheckbox) => {
  const element = fieldCheckbox.getFocusableElement();
  aria.setRole(element, aria.Role.CHECKBOX);
  aria.setState(
    element,
    aria.State.LABEL,
    fieldCheckbox.name ? `Checkbox ${fieldCheckbox.name}` : 'Checkbox',
  );
}, 'initView', Blockly.FieldCheckbox.prototype);
