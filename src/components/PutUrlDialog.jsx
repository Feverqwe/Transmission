import React from "react";
import {observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class PutUrlDialog extends React.PureComponent {
  static propTypes = {
    dialogStore: PropTypes.object.isRequired,
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {PutUrlDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const url = form.elements.url.value.trim();
    if (!url) return;

    const urls = [url];

    let directory = undefined;
    if (form.elements.directory) {
      const directoryIndex = parseInt(form.elements.directory.value, 10);
      if (directoryIndex > -1) {
        directory = this.rootStore.config.folders[directoryIndex];
      }
    }

    this.rootStore.client.sendFiles(urls, directory);

    this.dialogStore.close();
  };

  handleClose = (e) => {
    e && e.preventDefault();
    this.dialogStore.close();
  };

  render() {
    let directorySelect = null;
    const folders = this.rootStore.config.folders;
    if (folders.length) {
      directorySelect = (
        <div className="nf-subItem">
          <label>{chrome.i18n.getMessage('path')}</label>
          <select name="directory">
            <option value={-1}>{chrome.i18n.getMessage('defaultPath')}</option>
            {folders.map((folder, index) => {
              return (
                <option key={`option-${index}`} value={index}>{folder.name || folder.path}</option>
              );
            })}
          </select>
        </div>
      );
    }

    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            <div className="nf-subItem">
              <label>{chrome.i18n.getMessage('Paste_a_torrent_URL')}</label>
              <input type="text" name="url" autoFocus={true} required={true}/>
            </div>
            {directorySelect}
            <div className="nf-subItem">
              <input type="submit" value={chrome.i18n.getMessage('DLG_BTN_OK')}/>
              <input onClick={this.handleClose} type="button" value={chrome.i18n.getMessage('DLG_BTN_CANCEL')}/>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }
}

export default PutUrlDialog;