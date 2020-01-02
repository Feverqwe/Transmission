import React from "react";
import {observer} from "mobx-react";
import ColumnMenuItem from "./ColumnMenuItem";
import {FixedMenu} from "./FixedReactContexify";
import RootStoreCtx from "../tools/RootStoreCtx";

const FileColumnMenu = React.memo(() => {
  return (
    <FixedMenu id="file_column_menu" className="file-column-menu">
      <FileColumnMenuBody/>
    </FixedMenu>
  )
});

@observer
class FileColumnMenuBody extends React.Component {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
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