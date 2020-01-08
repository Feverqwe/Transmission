import "react-contexify/dist/ReactContexify.min.css";
import "rc-select/assets/index.css";
import "../assets/css/stylesheet.less";
import React from "react";
import Menu from "../components/Menu";
import {useObserver} from "mobx-react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import RootStore from "../stores/RootStore";
import TorrentListTable from "../components/TorrentListTable";
import FileListTable from "../components/FileListTable";
import Footer from "../components/Footer";
import PutFilesDialog from "../components/PutFilesDialog";
import RemoveConfirmDialog from "../components/RemoveConfirmDialog";
import PutUrlDialog from "../components/PutUrlDialog";
import Interval from "../components/Interval";
import getLogger from "../tools/getLogger";
import RenameDialog from "../components/RenameDialog";
import CopyMagnetUrlDialog from "../components/CopyMagnetUrlDialog";
import MoveDialog from "../components/MoveDialog";
import RootStoreCtx from "../tools/RootStoreCtx";

const logger = getLogger('Index');

const Index = React.memo(() => {
  const rootStore = React.useContext(RootStoreCtx);

  React.useEffect(() => {
    rootStore.init();

    if (rootStore.isPopup) {
      document.body.classList.add('popup');
    }
  }, []);

  const onIntervalFire = React.useCallback((isInit) => {
    if (isInit) {
      rootStore.client.updateSettings().catch((err) => {
        logger.error('onIntervalFire updateSettings error', err);
      });
    }
    rootStore.client.updateTorrentList(isInit).catch((err) => {
      logger.error('onIntervalFire updateTorrentList error', err);
    });
  }, []);

  return useObserver(() => {
    if (rootStore.state === 'pending') {
      return (
        <div className="loading"/>
      );
    }

    if (rootStore.state !== 'done') {
      return `Loading: ${rootStore.state}`;
    }

    let fileList = null;
    if (rootStore.fileList) {
      fileList = (
        <FileListTable key={rootStore.fileList.id}/>
      );
    }

    let setPopupHeight = null;
    if (rootStore.isPopup) {
      setPopupHeight = (
        <SetPopupHeight height={rootStore.config.popupHeight}/>
      );
    }

    const uiUpdateInterval = rootStore.config.uiUpdateInterval;

    let goInOptions = null;
    if (rootStore.config.hostname === '') {
      goInOptions = (
        <GoInOptions isPopup={rootStore.isPopup}/>
      );
    }

    return (
      <>
        <Interval onFire={onIntervalFire} interval={uiUpdateInterval}/>
        <Menu/>
        <TorrentListTable/>
        <Footer/>
        {setPopupHeight}
        {fileList}
        <Dialogs/>
        {goInOptions}
      </>
    );
  });
});

const Dialogs = React.memo(() => {
  const rootStore = React.useContext(RootStoreCtx);

  return useObserver(() => {
    const dialogs = [];
    rootStore.dialogs.forEach((dialog) => {
      switch (dialog.type) {
        case 'putFiles': {
          if (dialog.isReady) {
            dialogs.push(
              <PutFilesDialog key={dialog.id} dialogStore={dialog}/>
            );
          }
          break;
        }
        case 'putUrl': {
          dialogs.push(
            <PutUrlDialog key={dialog.id} dialogStore={dialog}/>
          );
          break;
        }
        case 'removeConfirm': {
          dialogs.push(
            <RemoveConfirmDialog key={dialog.id} dialogStore={dialog}/>
          );
          break;
        }
        case 'rename': {
          dialogs.push(
            <RenameDialog key={dialog.id} dialogStore={dialog}/>
          );
          break;
        }
        case 'copyMagnetUrl': {
          dialogs.push(
            <CopyMagnetUrlDialog key={dialog.id} dialogStore={dialog}/>
          );
          break;
        }
        case 'move': {
          dialogs.push(
            <MoveDialog key={dialog.id} dialogStore={dialog}/>
          );
          break;
        }
      }
    });

    return (
      dialogs
    );
  });
});

const SetPopupHeight = React.memo(({height}) => {
  React.useEffect(() => {
    const root = document.getElementById('root');
    root.style.minHeight = height + 'px';
    root.style.maxHeight = height + 'px';
  }, [height]);
  return null;
});
SetPopupHeight.propTypes = {
  height: PropTypes.number.isRequired,
};

const GoInOptions = React.memo(({isPopup}) => {
  React.useEffect(() => {
    if (isPopup) {
      location.href = '/options.html#/#redirectPopup'
    } else {
      location.href = '/options.html#/#redirect'
    }
  }, []);
  return null;
});
GoInOptions.propTypes = {
  isPopup: PropTypes.bool.isRequired,
};

const rootStore = window.rootStore = RootStore.create();

ReactDOM.render(
  <RootStoreCtx.Provider value={rootStore}>
    <Index/>
  </RootStoreCtx.Provider>,
  document.getElementById('root')
);