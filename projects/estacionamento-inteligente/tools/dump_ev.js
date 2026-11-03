// prints the system timeline (EV) as JSON for audio.py
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { Math, console, JSON }; vm.createContext(ctx);
for (const f of ['lib.js', 'env.js', 'sim.js']) vm.runInContext(fs.readFileSync(path.join(process.cwd(), 'web', f), 'utf8').replace(/^const /gm, 'var ').replace(/^let /gm, 'var '), ctx);
console.log(JSON.stringify(vm.runInContext('EV', ctx)));
