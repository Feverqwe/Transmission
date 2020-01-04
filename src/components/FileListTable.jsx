import React from "react";
import {observer} from "mobx-react";
import TableHeadColumn from "./TableHeadColumn";
import PropTypes from "prop-types";
import FileListTableItem from "./FileListTableItem";
import FileMenu from "./FileMenu";
import FileColumnMenu from "./FileColumnMenu";
import {contextMenu} from "react-contexify";
import Interval from "./Interval";
import getLogger from "../tools/getLogger";
import RootStoreCtx from "../tools/RootStoreCtx";

const logger = getLogger('FileListTable');

@observer
class FileListTable extends React.PureComponent {
  static contextType = RootStoreCtx;

  componentDidMount() {
    if (!this.rootStore.torrentList.isSelectedId(this.fileListStore.id)) {
      this.fileListStore.setRemoveSelectOnHide(true);
    }
    this.rootStore.torrentList.addSelectedId(this.fileListStore.id, true);
  }

  handleScroll = (e) => {
    const fileList = e.currentTarget;
    const fixedHead = this.refFixedHead.current;

    // required for ff only
    const isWide = fileList.scrollWidth >= document.body.clientWidth;

    if (isWide && fileList.scrollLeft > 0) {
        fixedHead.style.left = `${fileList.scrollLeft * -1}px`;
    } else
    if (fixedHead.style.left) {
      fixedHead.style.left = '';
    }
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {FileListStore}*/
  get fileListStore() {
    return this.rootStore.fileList;
  }

  refFixedHead = React.createRef();

  handleClose = (e) => {
    e && e.preventDefault();
    this.rootStore.destroyFileList();
  };

  handleUpdate = (e) => {
    e.preventDefault();
    this.fileListStore.fetchFiles();
  };

  onIntervalFire = () => {
    this.fileListStore.fetchFiles().catch((err) => {
      logger.error('onIntervalFire fetchFiles error', err);
    });
  };

  render() {
    const torrent = this.fileListStore.torrent;

    if (!torrent) {
      return (
        <CloseFileList onClose={this.handleClose}/>
      );
    }

    let spinner = null;
    if (this.fileListStore.isLoading) {
      spinner = (
        <div className="loading"/>
      );
    }

    let directory = null;
    if (this.fileListStore.joinedDirectory) {
      directory = (
        <input type="text" value={this.fileListStore.joinedDirectory} readOnly="readonly"/>
      );
    }

    const uiUpdateInterval = this.rootStore.config.uiUpdateInterval;

    return (
      <>
        <div className="file-list-warpper">
          <div className="file-list">
            <Interval interval={uiUpdateInterval} onInit={this.onIntervalFire} onFire={this.onIntervalFire}/>
            <div onScroll={this.handleScroll} className="fl-layer">
              {spinner}
              <table ref={this.refFixedHead} className="fl-table-head" border="0" cellSpacing="0" cellPadding="0">
                <FileListTableHead withStyle={true}/>
              </table>
              <table className="fl-table-body" border="0" cellSpacing="0" cellPadding="0">
                <FileListTableHead/>
                <FileListTableFiles/>
              </table>
              <FileColumnMenu/>
            </div>
            <div className="bottom-menu">
              {directory}
              <div className="space"/>
              <a onClick={this.handleUpdate} className="update" title={chrome.i18n.getMessage('refresh')}/>
              <a onClick={this.handleClose} className="close" title={chrome.i18n.getMessage('DLG_BTN_CLOSE')}/>
            </div>
          </div>
        </div>
        <div onClick={this.handleClose} className="file-list-layer-temp"/>
      </>
    );
  }
}

class CloseFileList extends React.PureComponent {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.props.onClose();
  }

  render() {
    return null;
  }
}

@observer
class FileListTableHead extends React.PureComponent {
  static propTypes = {
    withStyle: PropTypes.bool,
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  handleSort = (column, directoin) => {
    this.rootStore.config.setFilesSort(column, directoin);
  };

  handleMoveColumn = (from, to) => {
    this.rootStore.config.moveFilesColumn(from, to);
  };

  handleSaveColumns = () => {
    this.rootStore.config.saveFilesColumns();
  };

  render() {
    const sort = this.rootStore.config.filesSort;
    const fileColumns = this.rootStore.config.visibleFileColumns;
    const columns = [];
    fileColumns.forEach((column, index) => {
      if (!column.display) return;

      columns.push(
        <FileListTableHeadColumn key={column.column} column={column}
          isSorted={sort.by === column.column} sortDirection={sort.direction}
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
class FileListTableHeadColumn extends TableHeadColumn {
  type = 'fl';

  /**@return {FileListStore}*/
  get fileListStore() {
    return this.rootStore.fileList;
  }

  handleSelectAll = (e) => {
    this.fileListStore.toggleSelectAll();
  };

  handleContextMenu = (e) => {
    e.preventDefault();

    contextMenu.show({
      id: 'file_column_menu',
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
          <input checked={this.fileListStore.isSelectedAll} onChange={this.handleSelectAll} type="checkbox"/>
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
      const styleText = `.fl-layer th.${column.column}, .fl-layer td.${column.column} {
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
class FileListTableFiles extends React.PureComponent {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  render() {
    const files = this.rootStore.fileList.sortedFiles.map((file) => {
      return (
        <FileListTableItem key={file.name} file={file}/>
      );
    });

    return (
      <tbody>
      {files}
      <FileMenu/>
      </tbody>
    );
  }
}

export default FileListTable;