import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub((fieldLabel) => {
  // There's no additional semantic meaning needed for a label; the aria-label
  // should be sufficient for context.
  aria.setState(
    fieldLabel.getFocusableElement(), aria.State.LABEL, fieldLabel.getText()
  );
}, 'initView', Blockly.FieldLabel.prototype);
