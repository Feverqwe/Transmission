const isFirefox = () => {
  return BUILD_ENV.browser === 'firefox';
};

export default isFirefox;