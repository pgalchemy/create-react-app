const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

function gitCommit(message) {
  execSync('git add -A', { stdio: 'ignore' });
  execSync(`git commit -m "${message}"`, {
    stdio: 'ignore',
  });
}

const customInit = appPath => {
  const customDependencies = [
    'styled-components@4.1.3',
    'redux@4.0.1',
    'react-router@4.3.1',
    'redux-saga@4.3.1',
  ];
  const customDevDependencies = [
    'prettier@1.16.4',
    'eslint-plugin-prettier@3.0.1',
    'pretty-quick@1.10.0',
    'husky@1.3.1',
  ];
  execSync(`yarn add ${customDependencies.join(' ')}`, { stdio: 'inherit' });
  execSync(`yarn add -D ${customDevDependencies.join(' ')}`, {
    stdio: 'inherit',
  });

  gitCommit('Installing custom Alchemy dependencies.');

  // Customize package.json
  const package = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  package.husky = {
    hooks: {
      'pre-commit': 'pretty-quick --staged',
    },
  };

  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(package, null, 2) + os.EOL
  );

  gitCommit('Add custom package.json properties.');
};

module.exports = customInit;
