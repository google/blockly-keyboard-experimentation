
import * as path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(__dirname);

/**
 * Replaces OS-specific path with POSIX style path.
 * Simplified implementation based on
 * https://stackoverflow.com/a/63251716/4969945
 *
 * @param {string} target target path
 * @return {string} posix path
 */
function posixPath(target) {
    return target.split(path.sep).join(path.posix.sep);
  }
  
// TODO: Add geras and other examples.
export const testFileLocations = {
  PLAYGROUND:
    'file://' +
    posixPath(path.join(__dirname), '..', '..',) +
    '/index.html',
};