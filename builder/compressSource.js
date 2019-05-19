require('./defaultBuildEnv');
const path = require('path');
const zipDirectory = require('./zipDirectory');

const compressSource = () => {
  const ext = 'zip';
  const outputPath = BUILD_ENV.outputPath;

  return zipDirectory({
    dirs: [
      {from: path.join(__dirname, '../builder'), to: 'builder'},
      {from: path.join(__dirname, '../src'), to: 'src'},
    ],
    files: [
      {from: path.join(__dirname, '../package.json'), to: 'package.json'},
      {from: path.join(__dirname, '../package-lock.json'), to: 'package-lock.json'},
      {from: path.join(__dirname, '../README.md'), to: 'README.md'},
      {from: path.join(__dirname, '../webpack.config.js'), to: 'webpack.config.js'},
    ]
  }, path.join(outputPath, `${BUILD_ENV.distName}-source.${ext}`));
};

compressSource();