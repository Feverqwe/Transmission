import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import {contextMenu} from "react-contexify";
import SpeedMenu from "./SpeedMenu";
import SpaceWatcher from "./SpaceWatcher";

@inject('rootStore')
@observer
class Footer extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  handleDownloadContextMenu = (e) => {
    e.preventDefault();

    contextMenu.show({
      id: 'speed_menu',
      event: e,
      props: {
        type: 'download'
      }
    });
  };

  handleUploadContextMenu = (e) => {
    e.preventDefault();

    contextMenu.show({
      id: 'speed_menu',
      event: e,
      props: {
        type: 'upload'
      }
    });
  };

  handleResetDownloadSpeed = (e) => {
    e.preventDefault();

    this.rootStore.client.setDownloadSpeedLimit(0);
  };

  handleResetUploadSpeed = (e) => {
    e.preventDefault();

    this.rootStore.client.setUploadSpeedLimit(0);
  };

  handleOpenTab = (e) => {
    e.preventDefault();
    chrome.tabs.create({url: `${location.origin}${location.pathname}`});
  };

  render() {
    const {downloadSpeedStr, uploadSpeedStr} = this.rootStore.client.currentSpeedStr;

    let downloadLimit = null;
    let uploadLimit = null;
    const settings = this.rootStore.client.settings;
    if (settings) {
      if (settings.downloadSpeedLimit && settings.downloadSpeedLimitEnabled) {
        downloadLimit = (
          <span onClick={this.handleResetDownloadSpeed} className="limit dl">{settings.downloadSpeedLimitStr}</span>
        );
      }
      if (settings.uploadSpeedLimit && settings.uploadSpeedLimitEnabled) {
        uploadLimit = (
          <span onClick={this.handleResetUploadSpeed} className="limit up">{settings.uploadSpeedLimitStr}</span>
        );
      }
    }

    let openInTab = null;
    if (this.rootStore.isPopup) {
      openInTab = (
        <div onClick={this.handleOpenTab} className="openInTab" title={chrome.i18n.getMessage('openInTab')}/>
      );
    }

    let spaceWatcher = null;
    if (this.rootStore.config.showFreeSpace) {
      spaceWatcher = (
        <SpaceWatcher/>
      );
    }

    return (
      <table className="status-panel" width="100%" border="0" cellSpacing="0" cellPadding="0">
        <tfoot>
        <tr>
          <td className="status">
            <div>{this.rootStore.client.lastErrorMessage}</div>
          </td>
          {spaceWatcher}
          <td onContextMenu={this.handleDownloadContextMenu} className="speed download">{downloadSpeedStr}{downloadLimit}</td>
          <td onContextMenu={this.handleUploadContextMenu} className="speed upload">{uploadSpeedStr}{uploadLimit}{openInTab}</td>
          <SpeedMenu/>
        </tr>
        </tfoot>
      </table>
    );
  }
}

export default Footer;