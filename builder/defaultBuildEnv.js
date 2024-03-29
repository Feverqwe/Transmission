const getArgvValue = require('./getArgvValue');
const path = require('path');

const mode = getArgvValue('--mode') || 'development';

const version = require('../src/manifest').version;

const browser = getArgvValue('--BROWSER') || 'chrome';

let targets;
if (browser === 'firefox') {
  targets = {
    firefox: mode === 'development' ? '88' : '88',
  };
} else {
  targets = {
    chrome: mode === 'development' ? '88' : '88',
  };
}

let babelEnvOptions;
if (mode === 'development') {
  babelEnvOptions = {
    targets,
  };
} else {
  babelEnvOptions = {
    targets,
  };
}

global.BUILD_ENV = {
  distName: `transmissionEasyClient-${browser}-${version}`,
  outputPath: path.join(__dirname, `../dist/${browser}`),
  mode,
  devtool: mode === 'development' ? 'inline-source-map' : 'none',
  version,
  browser,
  babelEnvOptions,
  FLAG_ENABLE_LOGGER: true,
};