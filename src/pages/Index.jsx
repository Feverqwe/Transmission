import "react-contexify/dist/ReactContexify.min.css";
import "rc-select/assets/index.css";
import "../assets/css/stylesheet.less";
import React from "react";
import Menu from "../components/Menu";
import {inject, observer, Provider} from "mobx-react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import RootStore from "../stores/RootStore";
import TorrentListTable from "../components/TorrentListTable";
import FileListTable from "../components/FileListTable";
import Footer from "../components/Footer";
import PutFilesDialog from "../components/PutFilesDialog";
import CreateLabelDialog from "../components/CreateLabelDialog";
import RemoveConfirmDialog from "../components/RemoveConfirmDialog";
import PutUrlDialog from "../components/PutUrlDialog";
import Interval from "../components/Interval";
import getLogger from "../tools/getLogger";

const logger = getLogger('Index');

@inject('rootStore')
@observer
class Index extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.rootStore.init();

    if (this.rootStore.isPopup) {
      document.body.classList.add('popup');
    }
  }

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  onIntervalInit = () => {
    this.rootStore.client.getSettings().catch((err) => {
      logger.error('onIntervalInit getSettings error', err);
    });
  };

  onIntervalFire = () => {
    this.rootStore.client.syncUiClient().catch((err) => {
      logger.error('onIntervalFire syncUiClient error', err);
    });
  };

  render() {
    if (this.rootStore.state === 'pending') {
      return (
        <div className="loading"/>
      );
    }

    if (this.rootStore.state !== 'done') {
      return `Loading: ${this.rootStore.state}`;
    }

    let fileList = null;
    if (this.rootStore.fileList) {
      fileList = (
        <FileListTable key={this.rootStore.fileList.id}/>
      );
    }

    let setPopupHeight = null;
    if (this.rootStore.isPopup) {
      setPopupHeight = (
        <SetPopupHeight key={'h-' + this.rootStore.config.popupHeight} height={this.rootStore.config.popupHeight}/>
      );
    }

    const uiUpdateInterval = this.rootStore.config.uiUpdateInterval;

    let goInOptions = null;
    if (this.rootStore.config.hostname === '') {
      goInOptions = (
        <GoInOptions isPopup={this.rootStore.isPopup}/>
      );
    }

    return (
      <>
        <Interval key={'' + uiUpdateInterval} onInit={this.onIntervalInit} onFire={this.onIntervalFire} interval={uiUpdateInterval}/>
        <Menu/>
        <TorrentListTable/>
        <Footer/>
        {setPopupHeight}
        {fileList}
        <Dialogs/>
        {goInOptions}
      </>
    );
  }
}

@inject('rootStore')
@observer
class Dialogs extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  render() {
    const dialogs = Array.from(this.rootStore.dialogs.values()).map((dialog) => {
      switch (dialog.type) {
        case 'putFiles': {
          if (dialog.isReady) {
            return (
              <PutFilesDialog key={dialog.id} dialogStore={dialog}/>
            );
          } else {
            return null;
          }
        }
        case 'putUrl': {
          return (
            <PutUrlDialog key={dialog.id} dialogStore={dialog}/>
          );
        }
        case 'createLabel': {
          return (
            <CreateLabelDialog key={dialog.id} dialogStore={dialog}/>
          );
        }
        case 'removeConfirm': {
          return (
            <RemoveConfirmDialog key={dialog.id} dialogStore={dialog}/>
          );
        }
      }
    });

    return (
      dialogs
    );
  }
}

class SetPopupHeight extends React.PureComponent {
  static propTypes = {
    height: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);

    document.getElementById('root').style.minHeight = this.props.height + 'px';
  }

  render() {
    return null;
  }
}

class GoInOptions extends React.PureComponent {
  static propTypes = {
    isPopup: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);

    if (this.props.isPopup) {
      location.href = '/options.html#/#redirectPopup'
    } else {
      location.href = '/options.html#/#redirect'
    }
  }

  render() {
    return null;
  }
}

const rootStore = window.rootStore = RootStore.create();

ReactDOM.render(
  <Provider rootStore={rootStore}>
    <Index/>
  </Provider>,
  document.getElementById('root')
);