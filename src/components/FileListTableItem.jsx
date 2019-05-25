import {inject, observer} from "mobx-react";
import React from "react";
import PropTypes from "prop-types";
import {contextMenu} from "react-contexify";

@inject('rootStore')
@observer
class FileListTableItem extends React.Component {
  static propTypes = {
    file: PropTypes.object.isRequired,
    rootStore: PropTypes.object,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {FileListStore}*/
  get fileListStore() {
    return this.rootStore.fileList;
  }

  /**@return {FileStore}*/
  get fileStore() {
    return this.props.file;
  }

  handleSelect = (e) => {
    if (!this.fileStore.selected) {
      if (e.nativeEvent.shiftKey) {
        this.fileListStore.addMultipleSelectedId(this.fileStore.name);
      } else {
        this.fileListStore.addSelectedId(this.fileStore.name);
      }
    } else {
      this.fileListStore.removeSelectedId(this.fileStore.name);
    }
  };

  handleContextMenu = (e) => {
    e.preventDefault();

    let onHide = null;
    if (!this.fileStore.selected) {
      onHide = this.handleContextMenuHide;
      this.fileListStore.addSelectedId(this.fileStore.name);
    }

    contextMenu.show({
      id: 'file_menu',
      event: e,
      props: {
        source: e.currentTarget,
        onHide: onHide,
      }
    });
  };

  handleContextMenuHide = () => {
    if (this.fileListStore) {
      this.fileListStore.removeSelectedId(this.fileStore.name);
    }
  };

  render() {
    const fileStore = this.fileStore;
    const visibleFileColumns = this.rootStore.config.visibleFileColumns;

    const columns = [];
    visibleFileColumns.forEach(({column: name}) => {
      switch (name) {
        case 'checkbox': {
          columns.push(
            <td key={name} className={name}>
              <input checked={fileStore.selected} onChange={this.handleSelect} type="checkbox"/>
            </td>
          );
          break;
        }
        case 'name': {
          columns.push(
            <td key={name} className={name}>
              <FileName fileListStore={this.fileListStore} fileStore={fileStore}/>
            </td>
          );
          break;
        }
        case 'size': {
          columns.push(
            <td key={name} className={name}>
              <div>{fileStore.sizeStr}</div>
            </td>
          );
          break;
        }
        case 'downloaded': {
          columns.push(
            <td key={name} className={name}>
              <div>{fileStore.downloadedStr}</div>
            </td>
          );
          break;
        }
        case 'done': {
          const backgroundColor = (fileStore.size === fileStore.downloaded && fileStore.priority !== 0) ? '#41B541' : '#3687ED';
          const width = fileStore.progressStr;

          columns.push(
            <td key={name} className={name}>
              <div className="progress_b">
                <div className="val">{fileStore.progressStr}</div>
                <div className="progress_b_i" style={{backgroundColor, width}}/>
              </div>
            </td>
          );
          break;
        }
        case 'prio': {
          columns.push(
            <td key={name} className={name}>
              <div>{fileStore.priorityStr}</div>
            </td>
          );
          break;
        }
      }
    });

    const classList = [];
    if (fileStore.selected) {
      classList.push('selected');
    }

    return (
      <tr onContextMenu={this.handleContextMenu} className={classList.join(' ')}>
        {columns}
      </tr>
    );
  }
}

@observer
class FileName extends React.Component {
  static propTypes = {
    fileStore: PropTypes.object.isRequired,
    fileListStore: PropTypes.object.isRequired,
  };

  /**@return {FileListStore}*/
  get fileListStore() {
    return this.props.fileListStore;
  }

  /**@return {FileStore}*/
  get fileStore() {
    return this.props.fileStore;
  }

  handleSetFilter = (level) => {
    if (level === this.fileListStore.filterLevel) {
      level--;
    }

    const filter = this.fileStore.nameParts.slice(0, level).join('/');

    this.fileListStore.setFilter(filter);
  };

  render() {
    const parts = [];

    const nameParts = this.fileStore.nameParts;
    const filterLevel = this.fileListStore.filterLevel;
    for (let i = filterLevel; i < nameParts.length; i++) {
      parts.push(nameParts[i]);
    }

    const filename = parts.pop();
    const links = parts.map((name, index) => {
      return (
        <FileNamePart key={name} onSetFilter={this.handleSetFilter} level={filterLevel + index + 1} name={name}/>
      );
    });

    if (filterLevel > 0) {
      const name = '←';
      links.unshift(
        <FileNamePart key={name} onSetFilter={this.handleSetFilter} level={filterLevel} name={name}/>
      );
    }

    return (
      <div>
        <span>{links}{filename}</span>
      </div>
    );
  }
}

class FileNamePart extends React.PureComponent {
  static propTypes = {
    level: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    onSetFilter: PropTypes.func.isRequired,
  };

  handleClick = (e) => {
    e.preventDefault();
    this.props.onSetFilter(this.props.level);
  };

  render() {
    const classList = ['folder', `c${this.props.level - 1}`];

    return (
      <a onClick={this.handleClick} className={classList.join(' ')} href="#">{this.props.name}</a>
    );
  }
}

export default FileListTableItem;