import React from "react";
import {observer} from "mobx-react";
import {contextMenu} from "react-contexify";
import SpeedMenu from "./SpeedMenu";
import SpaceWatcher from "./SpaceWatcher";
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class Footer extends React.PureComponent {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
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

    if (this.rootStore.client.settings.altSpeedEnabled) {
      this.rootStore.client.setAltSpeedEnabled(false);
    } else {
      this.rootStore.client.setDownloadSpeedLimitEnabled(false);
    }
  };

  handleResetUploadSpeed = (e) => {
    e.preventDefault();

    if (this.rootStore.client.settings.altSpeedEnabled) {
      this.rootStore.client.setAltSpeedEnabled(false);
    } else {
      this.rootStore.client.setUploadSpeedLimitEnabled(false);
    }
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
      if (settings.altSpeedEnabled || settings.downloadSpeedLimitEnabled) {
        let speedStr = null;
        if (settings.altSpeedEnabled) {
          speedStr = settings.altDownloadSpeedLimitStr;
        } else {
          speedStr = settings.downloadSpeedLimitStr;
        }
        downloadLimit = (
          <span onClick={this.handleResetDownloadSpeed} className="limit dl">{speedStr}</span>
        );
      }
      if (settings.altSpeedEnabled || settings.uploadSpeedLimitEnabled) {
        let speedStr = null;
        if (settings.altSpeedEnabled) {
          speedStr = settings.altUploadSpeedLimitStr;
        } else {
          speedStr = settings.uploadSpeedLimitStr;
        }
        uploadLimit = (
          <span onClick={this.handleResetUploadSpeed} className="limit up">{speedStr}</span>
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