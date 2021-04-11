import React from "react";
import {observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class RemoveConfirmDialog extends React.PureComponent {
  static propTypes = {
    dialogStore: PropTypes.object.isRequired,
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {RemoveConfirmDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();

    this.rootStore.client.torrentsRemoveTorrent(this.dialogStore.torrentIds);

    this.dialogStore.close();
  };

  handleClose = (e) => {
    e && e.preventDefault();
    this.dialogStore.close();
  };

  render() {
    let label = null;
    let filename = null;

    const count = this.dialogStore.torrentIds.length;
    if (count === 1) {
      const id = this.dialogStore.torrentIds[0];
      const torrent = this.rootStore.client.torrents.get(id);
      if (torrent) {
        filename = (
          <span className="fileName">{torrent.name}</span>
        );
      }

      label = (
        <label>{chrome.i18n.getMessage('OV_CONFIRM_DELETE_ONE')}</label>
      );
    } else {
      label = (
        <label>{chrome.i18n.getMessage('OV_CONFIRM_DELETE_MULTIPLE').replace('%d', count)}</label>
      );
    }

    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            <div className="nf-subItem">
              {label}
              {filename}
            </div>
            <div className="nf-subItem">
              <input type="submit" value={chrome.i18n.getMessage('DLG_BTN_YES')}/>
              <input onClick={this.handleClose} autoFocus={true} type="button" value={chrome.i18n.getMessage('DLG_BTN_NO')}/>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }
}

export default RemoveConfirmDialog;