import * as chai from 'chai';

import { testFileLocations } from '../utils/file_locations.mjs';
import { testSetup } from '../utils/test_setup.mjs';
import { Key } from 'webdriverio'

suite('Testing testing', function () {
    // Setting timeout to unlimited as the webdriver takes a longer time to run than most mocha test
    this.timeout(0);
  
    // Setup Selenium for all of the tests
    suiteSetup(async function () {
      //this.browser = await testSetup(testFileLocations.PLAYGROUND);
      this.browser = await testSetup('file:///home/fenichel/Documents/blockly-dev/keyboard-experimentation/test/index.html')
    });
  
    test('Default workspace', async function () {
      const blockCount = await this.browser.execute(() => {
        return getMainWorkspace().getAllBlocks(false).length;
      });
  
      chai.assert.equal(blockCount, 7);
    });  

    test('Click on workspace', async function () {
    const workspace = await this.browser.$('#blocklyDiv > div > svg.blocklySvg > g');
    await workspace.click();
    await this.browser.pause(50);

    for (let i = 0; i < 9; i++) {
        await this.browser.keys(Key.ArrowDown);
        await this.browser.pause(50);
    }
    
    await this.browser.pause(1000);
  
      const blockCount = await this.browser.execute(() => {
        return getMainWorkspace().getAllBlocks(false).length;
      });
      chai.assert.equal(blockCount, 7);
    });
  });
  