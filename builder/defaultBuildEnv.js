const getArgvValue = require('./getArgvValue');
const path = require('path');

const mode = getArgvValue('--mode') || 'development';

const version = require('../src/manifest').version;

const browser = getArgvValue('--BROWSER') || 'chrome';

let targets = null;
if (browser === 'firefox') {
  targets = {
    firefox: mode === 'development' ? '66' : '48',
  };
} else {
  targets = {
    chrome: mode === 'development' ? '74' : '49',
  };
}

global.BUILD_ENV = {
  distName: `uTiny-${browser}-${version}`,
  outputPath: path.join(__dirname, `../dist/${browser}`),
  mode: mode,
  devtool: mode === 'development' ? 'inline-source-map' : 'none',
  version: version,
  browser: browser,
  babelEnvOptions: {
    targets: targets,
    useBuiltIns: mode === 'development' ? false : 'usage',
  },
  FLAG_ENABLE_LOGGER: true,
};