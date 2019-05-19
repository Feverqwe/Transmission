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
    let label = undefined;
    if (e) {
      e.preventDefault();
      const form = e.currentTarget;

      if (form.elements.label) {
        const labelIndex = parseInt(form.elements.label.value, 10);
        if (labelIndex > -1) {
          label = this.rootStore.client.allLabels[labelIndex];
        }
      }

      if (form.elements.directory) {
        const directoryIndex = parseInt(form.elements.directory.value, 10);
        if (directoryIndex > -1) {
          directory = this.rootStore.config.folders[directoryIndex];
        }
      }
    }

    const files = this.dialogStore.files;

    const urls = files.map(file => URL.createObjectURL(file));

    this.rootStore.client.sendFiles(urls, directory, label);

    this.dialogStore.close();
  };

  handleClose = (e) => {
    e && e.preventDefault();
    this.dialogStore.close();
  };

  render() {
    let labelSelect = null;
    const allLabels = this.rootStore.client.allLabels;
    if (allLabels.length) {
      labelSelect = (
        <div className="nf-subItem">
          <label>{chrome.i18n.getMessage('OV_COL_LABEL')}</label>
          <select name="label">
            <option value={-1}/>
            {allLabels.map((label, index) => {
              return (
                <option key={`option-${index}`} value={index}>{label}</option>
              );
            })}
          </select>
        </div>
      );
    }

    let directorySelect = null;
    const folders = this.rootStore.config.folders;
    if (folders.length) {
      directorySelect = (
        <div className="nf-subItem">
          <label>{chrome.i18n.getMessage('ST_CAPT_FOLDER')}</label>
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
    if (!labelSelect || !directorySelect) {
      submit = (
        <Submit onSubmit={this.handleSubmit}/>
      );
    }

    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            {labelSelect}
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