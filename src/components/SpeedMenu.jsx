import React from "react";
import {Item, Separator} from "react-contexify";
import {observer} from "mobx-react";
import PropTypes from "prop-types";
import speedToStr from "../tools/speedToStr";
import {FixedMenu} from "./FixedReactContexify";
import RootStoreCtx from "../tools/RootStoreCtx";

const SpeedMenu = React.memo(() => {
  return (
    <FixedMenu id="speed_menu" className="speed-menu">
      <SpeedMenuBody/>
    </FixedMenu>
  )
});

@observer
class SpeedMenuBody extends React.Component {
  static propTypes = {
    propsFromTrigger: PropTypes.object,
  };

  static defaultProps = {
    propsFromTrigger: {},
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  get menuType() {
    return this.props.propsFromTrigger.type;
  }

  get isAltSpeed() {
    return this.rootStore.client.settings.altSpeedEnabled;
  }

  get speedLimit() {
    if (this.menuType === 'download') {
      if (this.isAltSpeed) {
        return this.rootStore.client.settings.altDownloadSpeedLimit;
      } else {
        return this.rootStore.client.settings.downloadSpeedLimit;
      }
    } else
    if (this.menuType === 'upload') {
      if (this.isAltSpeed) {
        return this.rootStore.client.settings.altUploadSpeedLimit;
      } else {
        return this.rootStore.client.settings.uploadSpeedLimit;
      }
    }
  }

  get speedLimitEnabled() {
    if (this.isAltSpeed) {
      return true;
    }
    if (this.menuType === 'download') {
      return this.rootStore.client.settings.downloadSpeedLimitEnabled;
    } else
    if (this.menuType === 'upload') {
      return this.rootStore.client.settings.uploadSpeedLimitEnabled;
    }
  }

  handleUnlimited = ({event: e, props}) => {
    if (this.menuType === 'download') {
      if (this.isAltSpeed) {
        this.rootStore.client.setAltSpeedEnabled(false);
      } else {
        this.rootStore.client.setDownloadSpeedLimitEnabled(false);
      }
    } else
    if (this.menuType === 'upload') {
      if (this.isAltSpeed) {
        this.rootStore.client.setAltSpeedEnabled(false);
      } else {
        this.rootStore.client.setUploadSpeedLimitEnabled(false);
      }
    }
  };

  handleSetSpeedLimit = ({event: e, props, speed}) => {
    if (this.menuType === 'download') {
      if (this.isAltSpeed) {
        this.rootStore.client.setAltDownloadSpeedLimit(speed);
      } else {
        this.rootStore.client.setDownloadSpeedLimit(speed);
      }
    } else
    if (this.menuType === 'upload') {
      if (this.isAltSpeed) {
        this.rootStore.client.setAltUploadSpeedLimit(speed);
      } else {
        this.rootStore.client.setUploadSpeedLimit(speed);
      }
    }
  };

  render() {
    const items = [];

    let selected = null;
    if (this.rootStore.client.settings && !this.speedLimitEnabled) {
      selected = (
        <label>●</label>
      );
    }
    items.push(
      <Item key={'unlimited'} onClick={this.handleUnlimited}>{selected}{chrome.i18n.getMessage('MENU_UNLIMITED')}</Item>
    );

    if (this.rootStore.client.settings) {
      items.push(
        <Separator key={`_`}/>
      );

      getSpeedArray(this.speedLimit, 10, true).forEach((speed) => {
        const selected = this.speedLimitEnabled && speed === this.speedLimit;
        const isDefault = speed === this.speedLimit;
        items.push(
          <SpeedLimitItem key={`speed-${speed}`} speed={speed} selected={selected} isDefault={isDefault} onSetSpeedLimit={this.handleSetSpeedLimit}/>
        );
      });
    }

    return (
      items
    );
  }
}

class SpeedLimitItem extends React.PureComponent {
  static propTypes = {
    speed: PropTypes.number.isRequired,
    selected: PropTypes.bool.isRequired,
    isDefault: PropTypes.bool.isRequired,
    onSetSpeedLimit: PropTypes.func.isRequired,
  };

  handleClick = ({event, props}) => {
    this.props.onSetSpeedLimit({event, props, speed: this.props.speed});
  };

  render() {
    let selected = null;
    if (this.props.selected) {
      selected = (
        <label>●</label>
      )
    }

    const speed = speedToStr(this.props.speed * 1024);

    let value = null;
    if (this.props.isDefault) {
      value = (
        <b>{speed}</b>
      )
    } else {
      value = speed;
    }

    return (
      <Item onClick={this.handleClick}>{selected}{value}</Item>
    );
  }
}

function getSpeedArray(currentLimit, count, maybeZero) {
  if (!maybeZero && !currentLimit) {
    currentLimit = 512;
  }
  const middle = Math.round(count / 2);
  let middleSpeed = currentLimit;
  if (middleSpeed < middle) {
    middleSpeed = middle;
  }
  const arr = new Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = Math.round((i + 1) / middle * middleSpeed);
  }
  if (currentLimit === 0) {
    arr.pop();
    arr.unshift(currentLimit);
  }
  return arr;
}

export default SpeedMenu;