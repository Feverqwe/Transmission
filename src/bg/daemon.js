import getLogger from "../tools/getLogger";
import promiseFinally from "../tools/promiseFinally";

const logger = getLogger('Daemon');

class Daemon {
  constructor(/**Bg*/bg) {
    this.bg = bg;

    this.isActive = false;
    this.retryCount = 0;
    this.intervalId = null;
    this.inProgress = false;
  }

  /**
   * @return {BgStore}
   */
  get bgStore() {
    return this.bg.bgStore;
  }

  handleFire() {
    logger.info('Fire');
    if (this.inProgress) return;
    this.inProgress = true;

    this.bg.client.updateTorrents().then(() => {
      this.retryCount = 0;
    }, (err) => {
      logger.error('updateTorrents error', err);
      if (++this.retryCount > 3) {
        logger.warn('Daemon stopped, cause', err);
        this.stop();
      }
    }).then(...promiseFinally(() => {
      this.inProgress = false;
    }));
  }

  start() {
    logger.info('Start');
    this.stop(true);

    if (this.bgStore.config.backgroundUpdateInterval >= 1000) {
      this.isActive = true;
      this.retryCount = 0;
      this.intervalId = setInterval(() => {
        this.handleFire();
      }, this.bgStore.config.backgroundUpdateInterval);
    }
  }

  stop(force) {
    if (!force) {
      logger.info('Stop');
    }
    this.isActive = false;
    clearInterval(this.intervalId);
  }

  destroy() {
    logger.info('Destroyed');
    this.stop();
  }
}

export default Daemon;