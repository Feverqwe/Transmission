import React from "react";
import {observer} from "mobx-react";
import PropTypes from "prop-types";
import TableHeadColumn from "./TableHeadColumn";
import TorrentListTableItem from "./TorrentListTableItem";
import TorrentMenu from "./TorrentMenu";
import TorrentColumnMenu from "./TorrentColumnMenu";
import {contextMenu} from "react-contexify";
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class TorrentListTable extends React.Component {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  componentDidMount() {
    this.rootStore.flushTorrentList();
  }

  handleScroll = (e) => {
    this.refFixedHead.current.style.left = `${e.currentTarget.scrollLeft * -1}px`;
  };

  refFixedHead = React.createRef();

  render() {
    return (
      <div onScroll={this.handleScroll} className="torrent-list-layer">
        <table ref={this.refFixedHead} className="torrent-table-head" border="0" cellSpacing="0" cellPadding="0">
          <TorrentListTableHead withStyle={true}/>
        </table>
        <table className="torrent-table-body" border="0" cellSpacing="0" cellPadding="0">
          <TorrentListTableHead/>
          <TorrentListTableTorrents/>
        </table>
        <TorrentColumnMenu/>
      </div>
    );
  }
}

@observer
class TorrentListTableHead extends React.Component {
  static propTypes = {
    withStyle: PropTypes.bool,
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  handleSort = (column, directoin) => {
    this.rootStore.config.setTorrentsSort(column, directoin);
  };

  handleMoveColumn = (from, to) => {
    this.rootStore.config.moveTorrensColumn(from, to);
  };

  handleSaveColumns = () => {
    this.rootStore.config.saveTorrentsColumns();
  };

  render() {
    const torrentsSort = this.rootStore.config.torrentsSort;
    const torrentColumns = this.rootStore.config.visibleTorrentColumns;
    const columns = [];
    torrentColumns.forEach((column) => {
      columns.push(
        <TorrentListTableHeadColumn key={column.column} column={column}
          isSorted={torrentsSort.by === column.column} sortDirection={torrentsSort.direction}
          onMoveColumn={this.handleMoveColumn}
          onSort={this.handleSort}
          onSaveColumns={this.handleSaveColumns}
          withStyle={this.props.withStyle}
        />
      );
    });

    return (
      <thead>
      <tr>
        {columns}
      </tr>
      </thead>
    );
  }
}

@observer
class TorrentListTableHeadColumn extends TableHeadColumn {
  type = 'tr';

  /**@return {TorrentListStore}*/
  get torrentListStore() {
    return this.rootStore.torrentList;
  }

  handleSelectAll = (e) => {
    this.torrentListStore.toggleSelectAll();
  };

  handleContextMenu = (e) => {
    e.preventDefault();

    contextMenu.show({
      id: 'torrent_column_menu',
      event: e
    });
  };

  render() {
    const {column, isSorted, sortDirection} = this.props;
    const classList = [column.column];
    if (isSorted) {
      if (sortDirection === 1) {
        classList.push('sortDown');
      } else {
        classList.push('sortUp');
      }
    }

    let body = null;
    if (column.column === 'checkbox') {
      body = (
        <div>
          <input checked={this.torrentListStore.isSelectedAll} onChange={this.handleSelectAll} type="checkbox"/>
        </div>
      );
    } else {
      body = (
        <div>
          {chrome.i18n.getMessage(column.lang + '_SHORT') || chrome.i18n.getMessage(column.lang)}
        </div>
      );
    }

    let style = null;
    if (this.props.withStyle) {
      const styleText = `.torrent-list-layer th.${column.column}, .torrent-list-layer td.${column.column} {
        min-width: ${column.width}px;
        max-width: ${column.width}px;
      }`.split(/\r?\n/).map(line => line.trim()).join('');
      style = (
        <style>{styleText}</style>
      );
    }

    let arraw = null;
    if (column.order !== 0) {
      arraw = (
        <i className="arrow"/>
      );
    }

    let onClick = null;
    if (column.order) {
      onClick = this.handleSort;
    }

    return (
      <th ref={this.refTh} onClick={onClick} onContextMenu={this.handleContextMenu} onDragStart={this.handleDragStart} onDragOver={this.handleDragOver} onDrop={this.handleDrop} className={classList.join(' ')} title={chrome.i18n.getMessage(column.lang)} draggable={true}>
        {body}
        <div className="resize-el" draggable={false} onClick={this.handleResizeClick} onMouseDown={this.handleResizeMouseDown}/>
        {arraw}
        {style}
      </th>
    );
  }
}

@observer
class TorrentListTableTorrents extends React.Component {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {TorrentListStore}*/
  get torrentListStore() {
    return this.rootStore.torrentList;
  }

  render() {
    const torrens = this.torrentListStore.sortedTorrents.map((torrent) => {
      return (
        <TorrentListTableItem key={torrent.id} torrent={torrent}/>
      );
    });

    return (
      <tbody>
        {torrens}
        <TorrentMenu/>
      </tbody>
    );
  }
}

export default TorrentListTable;