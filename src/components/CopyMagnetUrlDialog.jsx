import React from "react";
import {observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class CopyMagnetUrlDialog extends React.Component {
  static propTypes = {
    dialogStore: PropTypes.object.isRequired,
  };

  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {CopyMagnetUrlDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const input = form.elements.magnetLink;
    input.select();
    document.execCommand('copy');

    this.dialogStore.close();
  };

  handleClose = (e) => {
    e && e.preventDefault();
    this.dialogStore.close();
  };

  render() {
    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            <div className="nf-subItem">
              <label>{chrome.i18n.getMessage('magnetUri')}</label>
              <input type="text" name="magnetLink" defaultValue={this.dialogStore.magnetLink}/>
            </div>
            <div className="nf-subItem">
              <input type="submit" value={chrome.i18n.getMessage('copy')} autoFocus={true}/>
              <input onClick={this.handleClose} type="button" value={chrome.i18n.getMessage('DLG_BTN_CLOSE')}/>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }
}

export default CopyMagnetUrlDialog;