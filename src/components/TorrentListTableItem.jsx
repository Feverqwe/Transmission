import {observer} from "mobx-react";
import React from "react";
import PropTypes from "prop-types";
import {contextMenu} from 'react-contexify';
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class TorrentListTableItem extends React.PureComponent {
  static propTypes = {
    torrent: PropTypes.object.isRequired,
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {TorrentStore}*/
  get torrentStore() {
    return this.props.torrent;
  }

  /**@return {TorrentListStore}*/
  get torrentListStore() {
    return this.rootStore.torrentList;
  }

  handleSelect = (e) => {
    if (!this.torrentStore.selected) {
      if (e.nativeEvent.shiftKey) {
        this.torrentListStore.addMultipleSelectedId(this.torrentStore.id);
      } else {
        this.torrentListStore.addSelectedId(this.torrentStore.id);
      }
    } else {
      this.torrentListStore.removeSelectedId(this.torrentStore.id);
    }
  };

  handleStart = (e) => {
    e.preventDefault();
    this.torrentStore.start();
  };

  handleStop = (e) => {
    e.preventDefault();
    this.torrentStore.stop();
  };

  handleDblClick = (e) => {
    e.preventDefault();
    this.rootStore.createFileList(this.torrentStore.id);
  };

  handleContextMenu = (e) => {
    e.preventDefault();

    let onHide = null;
    if (!this.torrentStore.selected) {
      onHide = this.handleContextMenuHide;
      this.torrentListStore.addSelectedId(this.torrentStore.id);
    }

    contextMenu.show({
      id: 'torrent_menu',
      event: e,
      props: {
        source: e.currentTarget,
        onHide: onHide,
      }
    });
  };

  handleContextMenuHide = () => {
    this.torrentListStore.removeSelectedId(this.torrentStore.id);
  };

  render() {
    const torrent = this.torrentStore;
    const visibleTorrentColumns = this.rootStore.config.visibleTorrentColumns;

    const columns = [];
    visibleTorrentColumns.forEach(({column: name, width}) => {
      switch (name) {
        case 'checkbox': {
          columns.push(
            <td key={name} className={name}>
              <input checked={this.torrentStore.selected} onChange={this.handleSelect} type="checkbox"/>
            </td>
          );
          break;
        }
        case 'name': {
          columns.push(
            <td key={name} className={name}>
              <TorrentName name={torrent.name} width={width}/>
            </td>
          );
          break;
        }
        case 'order': {
          let value = torrent.order;
          if (!Number.isFinite(value)) {
            value = '*';
          }

          columns.push(
            <td key={name} className={name}>
              <div>{value}</div>
            </td>
          );
          break;
        }
        case 'size': {
          columns.push(
            <td key={name} className={name}>
              <div title={torrent.sizeStr}>{torrent.sizeStr}</div>
            </td>
          );
          break;
        }
        case 'remaining': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.remainingStr}</div>
            </td>
          );
          break;
        }
        case 'done': {
          const color = torrent.isSeeding ? '#41B541' : '#3687ED';
          const width = torrent.progressStr;

          columns.push(
            <td key={name} className={name}>
              <div className="progress_b">
                <div className="val">{torrent.progressStr}</div>
                <div style={{backgroundColor: color, width}} className="progress_b_i"/>
              </div>
            </td>
          );
          break;
        }
        case 'status': {
          columns.push(
            <td key={name} className={name}>
              <div title={torrent.stateText}>{torrent.stateText}</div>
            </td>
          );
          break;
        }
        case 'seeds': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.seeds}</div>
            </td>
          );
          break;
        }
        case 'peers': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.peers}</div>
            </td>
          );
          break;
        }
        case 'seeds_peers': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.activePeers} / {torrent.activeSeeds}</div>
            </td>
          );
          break;
        }
        case 'downspd': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.downloadSpeedStr}</div>
            </td>
          );
          break;
        }
        case 'upspd': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.uploadSpeedStr}</div>
            </td>
          );
          break;
        }
        case 'eta': {
          columns.push(
            <td key={name} className={name}>
              <div title={torrent.etaStr}>{torrent.etaStr}</div>
            </td>
          );
          break;
        }
        case 'upped': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.uploadedStr}</div>
            </td>
          );
          break;
        }
        case 'downloaded': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.downloadedStr}</div>
            </td>
          );
          break;
        }
        case 'shared': {
          columns.push(
            <td key={name} className={name}>
              <div>{torrent.shared / 1000}</div>
            </td>
          );
          break;
        }
        case 'added': {
          columns.push(
            <td key={name} className={name}>
              <div title={torrent.addedTimeStr}>{torrent.addedTimeStr}</div>
            </td>
          );
          break;
        }
        case 'completed': {
          columns.push(
            <td key={name} className={name}>
              <div title={torrent.completedTimeStr}>{torrent.completedTimeStr}</div>
            </td>
          );
          break;
        }
        case 'actions': {
          columns.push(
            <td key={name} className={name}>
              <div className="btns">
                <a onClick={this.handleStart} title={chrome.i18n.getMessage('ML_START')} className="start"
                   href="#start"/>
                <a onClick={this.handleStop} title={chrome.i18n.getMessage('ML_STOP')} className="stop" href="#stop"/>
              </div>
            </td>
          );
          break;
        }
      }
    });

    const classList = [];
    if (this.torrentStore.selected) {
      classList.push('selected');
    }

    return (
      <tr className={classList.join(' ')} id={torrent.id} onDoubleClick={this.handleDblClick} onContextMenu={this.handleContextMenu}>
        {columns}
      </tr>
    );
  }
}

class TorrentName extends React.PureComponent {
  static propTypes = {
    name: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
  };

  state = {
    name: null,
    width: null,
    shouldUpdateCalc: true,
    movebleClassName: null
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (prevState.name !== nextProps.name || prevState.width !== nextProps.width) {
      return {
        name: nextProps.name,
        width: nextProps.width,
        shouldUpdateCalc: true,
      };
    }
    return null;
  }

  componentWillUnmount() {
    this.cleanPreviewStyle();
  }

  refSpan = React.createRef();

  cleanPreviewStyle() {
    const moveName = this.state.movebleClassName;
    if (moveName) {
      const style = document.querySelector('style.' + moveName);
      if (style) {
        style.dataset.useCount = parseInt(style.dataset.useCount, 10) - 1;

        if (style.dataset.useCount < 1) {
          style.remove();
        }
      }
    }
  };

  handleMouseEnter = (e) => {
    this.setState({
      shouldUpdateCalc: false
    });

    this.cleanPreviewStyle();

    const width = this.props.width;
    const spanWidth = this.refSpan.current.offsetWidth;
    if (spanWidth < width) {
      this.setState({
        movebleClassName: null
      });
      return;
    }

    let elWidth = Math.ceil(spanWidth / 10);
    if (elWidth > 10) {
      if (elWidth < 100) {
        const t1 = Math.round(elWidth / 10);
        if (t1 > elWidth / 10) {
          elWidth = t1 * 10 * 10;
        } else {
          elWidth = (t1 * 10 + 5) * 10;
        }
      } else {
        elWidth = elWidth * 10;
      }
    } else {
      elWidth = elWidth * 10;
    }

    const timeCalc = Math.round(elWidth / width * 3.5);
    const moveName = `moveble_${width}_${elWidth}`;
    let style = document.querySelector('style.' + moveName);
    if (!style) {
      style = document.createElement('style');
      style.classList.add(moveName);
      style.dataset.useCount = '0';
      style.textContent = `
        @keyframes a_${moveName} {
          0%{margin-left:2px;}
          50%{margin-left:-${elWidth - width}px;}
          90%{margin-left:6px;}
          100%{margin-left:2px;}
        }
        div.${moveName}:hover > span {
          overflow: visible;
          animation: a_${moveName} ${timeCalc}s;
        }
      `.split(/\r?\n/).map(line => line.trim()).join('');
      document.body.appendChild(style);
    }

    style.dataset.useCount = parseInt(style.dataset.useCount, 10) + 1;

    this.setState({
      movebleClassName: moveName
    });
  };

  render() {
    let classList = ['title'];

    let onMouseEnter = null;
    if (this.state.shouldUpdateCalc) {
      onMouseEnter = this.handleMouseEnter;
    } else
    if (this.state.movebleClassName) {
      classList.push(this.state.movebleClassName);
    }

    return (
      <div className={classList.join(' ')}>
        <span ref={this.refSpan} onMouseEnter={onMouseEnter} title={this.props.name}>{this.props.name}</span>
      </div>
    );
  }
}

export default TorrentListTableItem;