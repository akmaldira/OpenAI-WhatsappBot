const { execSync } = require('child_process');
((argv = '') => {
    var args = argv || 'git pull -f'
    execSync(args)
})();