import React from "react";
import {Item, Separator} from "react-contexify";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import speedToStr from "../tools/speedToStr";
import {FixedMenu} from "./FixedReactContexify";

const SpeedMenu = React.memo(() => {
  return (
    <FixedMenu id="speed_menu" className="speed-menu">
      <SpeedMenuBody/>
    </FixedMenu>
  )
});

@inject('rootStore')
@observer
class SpeedMenuBody extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    propsFromTrigger: PropTypes.object,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  get menuType() {
    return this.props.propsFromTrigger.type;
  }

  get speedLimit() {
    if (this.menuType === 'download') {
      return this.rootStore.client.settings.downloadSpeedLimit;
    } else
    if (this.menuType === 'upload') {
      return this.rootStore.client.settings.uploadSpeedLimit;
    }
  }

  handleUnlimited = ({event: e, props}) => {
    if (this.menuType === 'download') {
      this.rootStore.client.setDownloadSpeedLimit(0);
    } else
    if (this.menuType === 'upload') {
      this.rootStore.client.setUploadSpeedLimit(0);
    }
  };

  handleSetSpeedLimit = ({event: e, props, speed}) => {
    if (this.menuType === 'download') {
      this.rootStore.client.setDownloadSpeedLimit(speed);
    } else
    if (this.menuType === 'upload') {
      this.rootStore.client.setUploadSpeedLimit(speed);
    }
  };

  render() {
    const items = [];

    let selected = null;
    if (this.rootStore.client.settings && !this.speedLimit) {
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

      getSpeedArray(this.speedLimit, 10).forEach((speed) => {
        items.push(
          <SpeedLimitItem key={`speed-${speed}`} speed={speed} selected={speed === this.speedLimit}
                          onSetSpeedLimit={this.handleSetSpeedLimit}/>
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

    return (
      <Item onClick={this.handleClick}>{selected}{speedToStr(this.props.speed * 1024)}</Item>
    );
  }
}

function getSpeedArray(currentLimit, count) {
  if (!currentLimit) {
    currentLimit = 512;
  }
  if (currentLimit < Math.round(count / 2)) {
    currentLimit = Math.round(count / 2);
  }
  const arr = new Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = Math.round((i + 1) / Math.round(count / 2) * currentLimit);
  }
  return arr;
}

export default SpeedMenu;