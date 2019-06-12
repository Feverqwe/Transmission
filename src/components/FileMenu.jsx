import {inject, observer} from "mobx-react";
import React from "react";
import {Item, Separator} from "react-contexify";
import ContextMenuBody from "./ContextMenuBody";
import PropTypes from "prop-types";
import {FixedMenu} from "./FixedReactContexify";

const fileMenuItems = [
  'high', 'normal', 'low', '_', 'dntdownload', 'rename'
];

const FileMenu = React.memo(() => {
  return (
    <FixedMenu id="file_menu" className="file-menu">
      <FileMenuBody/>
    </FixedMenu>
  )
});

@inject('rootStore')
@observer
class FileMenuBody extends ContextMenuBody {
  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {FileListStore}*/
  get fileListStore() {
    return this.rootStore.fileList;
  }

  get firstFile() {
    const selectedIds = this.fileListStore.selectedIds;
    if (selectedIds.length) {
      const id = selectedIds[0];
      return this.fileListStore.getFileById(id);
    }
    return null;
  }

  handleSetPriority = ({event: e, props, priority}) => {
    const id = this.fileListStore.id;
    const selectedIndexes = this.fileListStore.selectedIndexes;
    this.rootStore.client.filesSetPriority(id, selectedIndexes, priority);
    this.fileListStore.resetSelectedIds();
  };

  handleRename = ({event: e, props}) => {
    const id = this.fileListStore.id;
    const file = this.firstFile;
    if (!file) return;

    this.rootStore.createDialog({
      type: 'rename',
      path: file.name,
      torrentIds: [id]
    });
    this.fileListStore.resetSelectedIds();
  };

  render() {
    const selectedIds = this.fileListStore.selectedIds;
    if (!selectedIds.length) {
      return null;
    }

    let currentPriority = null;
    let lastPriority = null;
    const isEvery = selectedIds.every((id) => {
      const file = this.fileListStore.getFileById(id);
      if (file) {
        if (lastPriority === null) {
          lastPriority = file.priority;
        }
        return lastPriority === file.priority;
      }
    });
    if (isEvery) {
      currentPriority = lastPriority;
    }

    const buttons = [];
    fileMenuItems.forEach((action, index) => {
      switch (action) {
        case 'high': {
          buttons.push(
            <PriorityItem key={action} onSetPriority={this.handleSetPriority} selected={currentPriority === 3} level={3}/>
          );
          break;
        }
        case 'normal': {
          buttons.push(
            <PriorityItem key={action} onSetPriority={this.handleSetPriority} selected={currentPriority === 2} level={2}/>
          );
          break;
        }
        case 'low': {
          buttons.push(
            <PriorityItem key={action} onSetPriority={this.handleSetPriority} selected={currentPriority === 1} level={1}/>
          );
          break;
        }
        case 'dntdownload': {
          buttons.push(
            <PriorityItem key={action} onSetPriority={this.handleSetPriority} selected={currentPriority === 0} level={0}/>
          );
          break;
        }
        case 'rename': {
          buttons.push(
            <Item key={action} onClick={this.handleRename}>{chrome.i18n.getMessage('rename')}</Item>
          );
          break;
        }
        case '_': {
          buttons.push(
            <Separator key={'separator_' + index}/>
          );
          break;
        }
      }
    });

    return (
      buttons
    );
  }
}

class PriorityItem extends React.PureComponent {
  static propTypes = {
    level: PropTypes.number.isRequired,
    selected: PropTypes.bool.isRequired,
    onSetPriority: PropTypes.func.isRequired,
  };

  handleClick = ({event, props}) => {
    this.props.onSetPriority({event, props, priority: this.props.level});
  };

  render() {
    let selected = null;
    if (this.props.selected) {
      selected = (
        <label>●</label>
      )
    }

    let name = null;
    switch (this.props.level) {
      case 3: {
        name = chrome.i18n.getMessage('MF_HIGH');
        break;
      }
      case 2: {
        name = chrome.i18n.getMessage('MF_NORMAL');
        break;
      }
      case 1: {
        name = chrome.i18n.getMessage('MF_LOW');
        break;
      }
      case 0: {
        name = chrome.i18n.getMessage('MF_DONT');
        break;
      }
    }

    return (
      <Item onClick={this.handleClick}>{selected}{name}</Item>
    );
  }
}

export default FileMenu;