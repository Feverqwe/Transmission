import React from "react";
import {inject, observer} from "mobx-react";
import ColumnMenuItem from "./ColumnMenuItem";
import {FixedMenu} from "./FixedReactContexify";

const FileColumnMenu = React.memo(() => {
  return (
    <FixedMenu id="file_column_menu" className="file-column-menu">
      <FileColumnMenuBody/>
    </FixedMenu>
  )
});

@inject('rootStore')
@observer
class FileColumnMenuBody extends React.Component {
  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  handleToggleColumn = ({event: e, props, column}) => {
    column.toggleDisplay();
    this.rootStore.config.saveFilesColumns();
  };

  render() {
    const items = this.rootStore.config.filesColumns.map((column) => {
      return (
        <ColumnMenuItem key={column.column} column={column} onToggleColumn={this.handleToggleColumn}>{chrome.i18n.getMessage(column.lang)}</ColumnMenuItem>
      );
    });

    return (
      items
    );
  }
}

export default FileColumnMenu;