import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";

@inject('rootStore')
@observer
class PutFilesDialog extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    dialogStore: PropTypes.object.isRequired,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {SpaceWatcher}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    let directory = undefined;
    if (e) {
      e.preventDefault();
      const form = e.currentTarget;

      if (form.elements.directory) {
        const directoryIndex = parseInt(form.elements.directory.value, 10);
        if (directoryIndex > -1) {
          directory = this.rootStore.config.folders[directoryIndex];
        }
      }
    }

    const files = this.dialogStore.files;

    const urls = files.map(file => URL.createObjectURL(file));

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

    let submit = null;
    if (!directorySelect) {
      submit = (
        <Submit onSubmit={this.handleSubmit}/>
      );
    }

    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            {directorySelect}
            {submit}
            <div className="nf-subItem">
              <input type="submit" value={chrome.i18n.getMessage('DLG_BTN_OK')}
                     autoFocus={true}/>
              <input onClick={this.handleClose} type="button" value={chrome.i18n.getMessage('DLG_BTN_CANCEL')}/>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }
}

class Submit extends React.PureComponent {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    props.onSubmit();
  }

  render() {
    return null;
  }
}

export default PutFilesDialog;