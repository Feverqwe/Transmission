import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";

@inject('rootStore')
@observer
class RemoveConfirmDialog extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    dialogStore: PropTypes.object.isRequired,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {RemoveConfirmDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();

    this.rootStore.client.torrentsRemove(this.dialogStore.torrentIds);

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