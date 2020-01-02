import React from "react";
import {observer} from "mobx-react";
import ColumnMenuItem from "./ColumnMenuItem";
import {FixedMenu} from "./FixedReactContexify";
import RootStoreCtx from "../tools/RootStoreCtx";

const TorrentColumnMenu = React.memo(() => {
  return (
    <FixedMenu id="torrent_column_menu" className="torrent-column-menu">
      <TorrentColumnMenuBody/>
    </FixedMenu>
  )
});

@observer
class TorrentColumnMenuBody extends React.Component {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  handleToggleColumn = ({event: e, props, column}) => {
    column.toggleDisplay();
    this.rootStore.config.saveTorrentsColumns();
  };

  render() {
    const items = this.rootStore.config.torrentColumns.map((column) => {
      return (
        <ColumnMenuItem key={column.column} column={column} onToggleColumn={this.handleToggleColumn}>{chrome.i18n.getMessage(column.lang)}</ColumnMenuItem>
      );
    });

    return (
      items
    );
  }
}

export default TorrentColumnMenu;