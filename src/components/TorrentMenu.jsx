import React from "react";
import {Item, Separator, Submenu} from "react-contexify";
import {inject, observer} from "mobx-react";
import ContextMenuBody from "./ContextMenuBody";
import {FixedMenu} from "./FixedReactContexify";

const torrentMenuItems = [
  'start', 'forcestart',
  'stop', '_', 'recheck', 'remove',
  'remove_with', '_', 'extra', 'order', '_', 'torrent_files'
];

const TorrentMenu = React.memo(() => {
  return (
    <FixedMenu id="torrent_menu" className="torrent-menu">
      <TorrentMenuBody/>
    </FixedMenu>
  )
});

@inject('rootStore')
@observer
class TorrentMenuBody extends ContextMenuBody {
  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {TorrentListStore}*/
  get torrentListStore() {
    return this.rootStore.torrentList;
  }

  handleStart = ({event: e, props}) => {
    this.rootStore.client.torrentsStart(this.torrentListStore.selectedIds);
  };

  handleForceStart = ({event: e, props}) => {
    this.rootStore.client.torrentsForceStart(this.torrentListStore.selectedIds);
  };

  handleStop = ({event: e, props}) => {
    this.rootStore.client.torrentsStop(this.torrentListStore.selectedIds);
  };

  handleRecheck = ({event: e, props}) => {
    this.rootStore.client.torrentsRecheck(this.torrentListStore.selectedIds);
  };

  handleRemove = ({event: e, props}) => {
    this.rootStore.createDialog({
      type: 'removeConfirm',
      torrentIds: this.torrentListStore.selectedIds.slice(0)
    });
  };

  handleRemoveTorrent = ({event: e, props}) => {
    this.rootStore.client.torrentsRemoveTorrent(this.torrentListStore.selectedIds);
  };

  handleRemoveTorrentFiles = ({event: e, props}) => {
    this.rootStore.client.torrentsRemoveTorrentFiles(this.torrentListStore.selectedIds);
  };

  handleRename = ({event: e, props}) => {
    // todo: handleRename
  };

  handleGetMagnet = ({event: e, props}) => {
    // todo: handleGetMagnet
  };

  handleMove = ({event: e, props}) => {
    // todo: handleMove
  };

  handleReannounce = ({event: e, props}) => {
    this.rootStore.client.reannounce(this.torrentListStore.selectedIds);
  };

  handleQueueTop = ({event: e, props}) => {
    this.rootStore.client.torrentsQueueTop(this.torrentListStore.selectedIds);
  };

  handleQueueUp = ({event: e, props}) => {
    this.rootStore.client.torrentsQueueUp(this.torrentListStore.selectedIds);
  };

  handleQueueDown = ({event: e, props}) => {
    this.rootStore.client.torrentsQueueDown(this.torrentListStore.selectedIds);
  };

  handleQueueBottom = ({event: e, props}) => {
    this.rootStore.client.torrentsQueueBottom(this.torrentListStore.selectedIds);
  };

  handleShowFiles = ({event: e, props}) => {
    if (this.torrentListStore.selectedIds.length) {
      const id = this.torrentListStore.selectedIds[0];
      this.rootStore.createFileList(id);
    }
  };

  render() {
    const selectedIds = this.torrentListStore.selectedIds;
    if (!selectedIds.length) {
      return null;
    }

    const disabledActions = [];
    if (selectedIds.length > 1) {
      disabledActions.push('torrent_files');
    }

    const actions = ['_', 'remove', 'remove_with', 'extra', 'order', 'torrent_files'];
    selectedIds.forEach((id) => {
      const torrent = this.rootStore.client.torrents.get(id);
      if (torrent) {
        torrent.actions.forEach((action) => {
          if (actions.indexOf(action) === -1) {
            actions.push(action);
          }
        });
      }
    });

    const buttons = [];
    torrentMenuItems.forEach((action, index) => {
      if (disabledActions.indexOf(action) !== -1) return;
      if (actions.indexOf(action) === -1) return;

      switch (action) {
        case 'start': {
          buttons.push(
            <Item key={action} onClick={this.handleStart}>{chrome.i18n.getMessage('ML_START')}</Item>
          );
          break;
        }
        case 'forcestart': {
          buttons.push(
            <Item key={action} onClick={this.handleForceStart}>{chrome.i18n.getMessage('startNow')}</Item>
          );
          break;
        }
        case 'stop': {
          buttons.push(
            <Item key={action} onClick={this.handleStop}>{chrome.i18n.getMessage('ML_STOP')}</Item>
          );
          break;
        }
        case 'recheck': {
          buttons.push(
            <Item key={action} onClick={this.handleRecheck}>{chrome.i18n.getMessage('ML_FORCE_RECHECK')}</Item>
          );
          break;
        }
        case 'remove': {
          buttons.push(
            <Item key={action} onClick={this.handleRemove}>{chrome.i18n.getMessage('ML_REMOVE')}</Item>
          );
          break;
        }
        case 'remove_with': {
          buttons.push(
            <Submenu key={action} label={chrome.i18n.getMessage('ML_REMOVE_AND')}>
              <Item onClick={this.handleRemoveTorrent}>{chrome.i18n.getMessage('ML_DELETE_TORRENT')}</Item>
              <Item onClick={this.handleRemoveTorrentFiles}>{chrome.i18n.getMessage('ML_DELETE_DATATORRENT')}</Item>
            </Submenu>
          );
          break;
        }
        case 'extra': {
          let rename = null;
          let getMagnet = null;
          if (selectedIds.length === 1) {
            rename = (
              <Item onClick={this.handleRename}>{chrome.i18n.getMessage('rename')}</Item>
            );
            getMagnet = (
              <Item onClick={this.handleGetMagnet}>{chrome.i18n.getMessage('magnetUri')}</Item>
            );
          }

          const move = (
            <Item onClick={this.handleMove}>{chrome.i18n.getMessage('move')}</Item>
          );

          const reannounce = (
            <Item onClick={this.handleReannounce}>{chrome.i18n.getMessage('reannounce')}</Item>
          );

          buttons.push(
            <Submenu key={action} label={chrome.i18n.getMessage('extra')}>
              {rename}
              {getMagnet}
              {move}
              {reannounce}
            </Submenu>
          );
          break;
        }
        case 'order': {
          buttons.push(
            <Submenu key={action} label={chrome.i18n.getMessage('OV_COL_ORDER')}>
              <Item onClick={this.handleQueueTop}>{chrome.i18n.getMessage('queueTop')}</Item>
              <Item onClick={this.handleQueueUp}>{chrome.i18n.getMessage('up')}</Item>
              <Item onClick={this.handleQueueDown}>{chrome.i18n.getMessage('down')}</Item>
              <Item onClick={this.handleQueueBottom}>{chrome.i18n.getMessage('queueBottom')}</Item>
            </Submenu>
          );
          break;
        }
        case 'torrent_files': {
          buttons.push(
            <Item key={action} onClick={this.handleShowFiles}>{chrome.i18n.getMessage('showFileList')}</Item>
          );
          break;
        }
        case '_': {
          if (selectedIds.length === 1 || index !== 10) {
            buttons.push(
              <Separator key={action + index}/>
            );
          }
          break;
        }
      }
    });

    return (
      buttons
    );
  }
}

export default TorrentMenu;