import admin from './admin/index.js';
import sharedModules from './shared-modules/index.js';
import user from './user/index.js';

export default [...sharedModules, ...admin, ...user];
