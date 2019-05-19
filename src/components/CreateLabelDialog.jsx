import React from "react";
import {inject, observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";

@inject('rootStore')
@observer
class CreateLabelDialog extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    dialogStore: PropTypes.object.isRequired,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {CreateLabelDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const label = form.elements.label.value.trim();
    if (!label) return;

    this.rootStore.client.torrentsSetLabel(this.dialogStore.torrentIds, label);

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
              <label>{chrome.i18n.getMessage('OV_NEWLABEL_CAPTION')}</label>
              <input type="text" name="label" autoFocus={true} required={true}/>
            </div>
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

export default CreateLabelDialog;