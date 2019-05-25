require('./defaultBuildEnv');
const path = require('path');
const zipDirectory = require('./zipDirectory');

const compressDist = () => {
  const ext = 'zip';
  const outputPath = BUILD_ENV.outputPath;

  return zipDirectory({
    dirs: [
      path.join(BUILD_ENV.outputPath, './src')
    ]
  }, path.join(outputPath, `${BUILD_ENV.distName}.${ext}`));
};

compressDist();