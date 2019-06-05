import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";

@inject('rootStore')
@observer
class MoveDialog extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    dialogStore: PropTypes.object.isRequired,
  };

  state = {
    showCustomLocation: true
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {MoveDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    let location = null;

    if (form.elements.directory) {
      const directoryIndex = parseInt(form.elements.directory.value, 10);
      if (directoryIndex > -2) {
        if (directoryIndex === -1) {
          location = this.rootStore.client.settings.downloadDir;
        } else {
          location = this.rootStore.config.folders[directoryIndex].path;
        }
      }
    }

    if (location === null) {
      location = form.elements.location.value.trim();
    }

    this.rootStore.client.torrentSetLocation(this.dialogStore.torrentIds, location);

    this.dialogStore.close();
  };

  handleClose = (e) => {
    e && e.preventDefault();
    this.dialogStore.close();
  };

  handleChange = (e) => {
    const directoryIndex = parseInt(e.currentTarget.value, 10);
    this.setState({
      showCustomLocation: directoryIndex === -2
    });
  };

  render() {
    let directorySelect = null;
    const folders = this.rootStore.config.folders;
    if (folders.length) {
      directorySelect = (
        <div className="nf-subItem">
          <label>{chrome.i18n.getMessage('path')}</label>
          <select onChange={this.handleChange} name="directory" defaultValue={-2}>
            <option value={-2}/>
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

    let customLocation = null;
    if (this.state.showCustomLocation) {
      customLocation = (
        <div className="nf-subItem">
          <label>{chrome.i18n.getMessage('moveNewPath')}</label>
          <input type="text" name="location" defaultValue={this.dialogStore.directory} autoFocus={true}/>
        </div>
      );
    }

    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            {customLocation}
            {directorySelect}
            <div className="nf-subItem">
              <input type="submit" value={chrome.i18n.getMessage('DLG_BTN_APPLY')}/>
              <input onClick={this.handleClose} type="button" value={chrome.i18n.getMessage('DLG_BTN_CANCEL')}/>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }
}

export default MoveDialog;