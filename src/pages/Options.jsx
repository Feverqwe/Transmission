import "../assets/css/options.less";
import React from "react";
import RootStore from "../stores/RootStore";
import ReactDOM from "react-dom";
import {inject, observer, Provider} from "mobx-react";
import {HashRouter, NavLink, Redirect, Route, Switch, withRouter} from "react-router-dom";
import PropTypes from "prop-types";
import {SketchPicker} from "react-color";
import Popover from "react-tiny-popover";
import getLogger from "../tools/getLogger";
import storageGet from "../tools/storageGet";
import storageSet from "../tools/storageSet";
import storageRemove from "../tools/storageRemove";
import {migrateConfig} from "../tools/loadConfig";

const logger = getLogger('Options');

@inject('rootStore')
@observer
class Options extends React.Component {
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

  render() {
    if (this.rootStore.state === 'pending') {
      return (
        <div className="loading"/>
      );
    }

    if (this.rootStore.state !== 'done') {
      return `Loading: ${this.rootStore.state}`;
    }

    return (
      <div className="container">
        <div className="search_panel">
          <h1>Transmission easy client</h1>
        </div>
        <HashRouter>
          <div className="content">
            <div className="left menu">
              <NavLink to="/" exact={true} activeClassName="active">{chrome.i18n.getMessage('optClient')}</NavLink>
              <NavLink to="/main" activeClassName="active">{chrome.i18n.getMessage('optMain')}</NavLink>
              <NavLink to="/notify" activeClassName="active">{chrome.i18n.getMessage('optNotify')}</NavLink>
              <NavLink to="/ctx" activeClassName="active">{chrome.i18n.getMessage('optCtx')}</NavLink>
              <NavLink to="/backup" activeClassName="active">{chrome.i18n.getMessage('backup')}</NavLink>
              <NavLink to="/restore" activeClassName="active">{chrome.i18n.getMessage('restore')}</NavLink>
            </div>
            <div className="right">
              <Switch>
                <Route path="/" exact={true} component={ClientOptions}/>
                <Route path="/main" exact={true} component={UiOptions}/>
                <Route path="/notify" exact={true} component={NotifyOptions}/>
                <Route path="/ctx" exact={true} component={CtxOptions}/>
                <Route path="/backup" exact={true} component={BackupOptions}/>
                <Route path="/restore" exact={true} component={RestoreOptions}/>
                <Route component={NotFound}/>
              </Switch>
            </div>
          </div>
        </HashRouter>
        <div className="bottom">
          <div className="author"><a title="email: leonardspbox@gmail.com"
                                     href="mailto:leonardspbox@gmail.com">Anton</a>, 2015
          </div>
        </div>
      </div>
    );
  }
}

@withRouter
@inject('rootStore')
@observer
class ClientOptions extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    location: PropTypes.object,
  };

  state = {
    clientStatus: null, // pending, done, error
    clientStatusText: '',
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {ConfigStore}*/
  get configStore() {
    return this.props.rootStore.config;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const login = form.elements.login.value;
    const password = form.elements.password.value;
    const hostname = form.elements.hostname.value;
    const port = parseInt(form.elements.port.value, 10);
    const ssl = form.elements.ssl.checked;
    const pathname = form.elements.pathname.value;

    this.setState({
      clientStatus: 'pending'
    });
    return Promise.resolve().then(() => {
      if (!Number.isFinite(port)) {
        throw new Error('Port is incorrect');
      }
      return this.rootStore.config.setOptions({
        login, password, hostname, port, ssl, pathname
      });
    }).then((() => {
      if (!this.refPage.current) return;
      return this.rootStore.client.getSettings();
    })).then(() => {
      if (!this.refPage.current) return;
      this.setState({
        clientStatus: 'done'
      });

      if (this.props.location.hash === '#redirect') {
        location.href = '/index.html'
      } else
      if (this.props.location.hash === '#redirectPopup') {
        location.href = '/index.html#popup'
      }
    }, (err) => {
      if (!this.refPage.current) return;
      this.setState({
        clientStatus: 'error',
        clientStatusText: `${err.name}: ${err.message}`
      });
    });
  };

  refPage = React.createRef();

  render() {
    let status = null;
    if (this.state.clientStatus) {
      switch (this.state.clientStatus) {
        case 'pending': {
          status = (
            <div>
              <img alt="" src={require('../assets/img/loading.gif')}/>
            </div>
          );
          break;
        }
        case 'done': {
          status = (
            <div>
              <span className="green">{chrome.i18n.getMessage('DLG_BTN_OK')}</span>
            </div>
          );
          break;
        }
        case 'error': {
          status = (
            <div>
              <span className="red">{this.state.clientStatusText}</span>
            </div>
          );
          break;
        }
      }
    }

    return (
      <div ref={this.refPage} className="page client">
        <form onSubmit={this.handleSubmit} autoComplete="off">
          <h2>{chrome.i18n.getMessage('optClient')}</h2>
          <label>
            <span>{chrome.i18n.getMessage('DLG_SETTINGS_4_CONN_16')}</span>
            <input name="login" type="text" defaultValue={this.configStore.login}/>
          </label>
          <label>
            <span>{chrome.i18n.getMessage('DLG_SETTINGS_4_CONN_18')}</span>
            <input name="password" type="password" defaultValue={this.configStore.password}/>
          </label>
          <label>
            <span>{chrome.i18n.getMessage('PRS_COL_IP')}</span>
            <input name="hostname" type="text" defaultValue={this.configStore.hostname} placeholder="127.0.0.1" required={true}/>
          </label>
          <label>
            <span>{chrome.i18n.getMessage('PRS_COL_PORT')}</span>
            <input name="port" type="number" defaultValue={this.configStore.port} required={true}/>
          </label>
          <h3>{chrome.i18n.getMessage('ST_CAPT_ADVANCED')}</h3>
          <label>
            <span>{chrome.i18n.getMessage('useSSL')}</span>
            <input type="checkbox" name="ssl" defaultValue={this.configStore.ssl}/>
          </label>
          <label>
            <span>{chrome.i18n.getMessage('path')}</span>
            <input type="text" name="pathname" defaultValue={this.configStore.pathname}/>
          </label>
          <div id="checkContainer">
            <div>
              <button type="submit">{chrome.i18n.getMessage('DLG_BTN_APPLY')}</button>
            </div>
            {status}
          </div>
        </form>
      </div>
    );
  }
}

class OptionsPage extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  /**@return {ConfigStore}*/
  get configStore() {
    return this.props.rootStore.config;
  }

  handleChange = (e) => {
    const checkbox = e.currentTarget;
    this.configStore.setOptions({
      [checkbox.name]: checkbox.checked
    });
  };

  handleSetInt = (e) => {
    const input = e.currentTarget;
    const value = parseInt(input.value, 10);
    if (Number.isFinite(value)) {
      this.configStore.setOptions({
        [input.name]: value
      });
    }
  };

  handleRadioChange = (e) => {
    const radio = e.currentTarget;
    this.configStore.setOptions({
      [radio.name]: radio.value
    });
  };
}

@inject('rootStore')
@observer
class UiOptions extends OptionsPage {
  render() {
    return (
      <div className="page main">
        <h2>{chrome.i18n.getMessage('optMain')}</h2>
        <label>
          <span>{chrome.i18n.getMessage('showFreeSpace')}</span>
          <input onChange={this.handleChange} name="showFreeSpace" type="checkbox" defaultChecked={this.configStore.showFreeSpace}/>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('hideSeedStatusItem')}</span>
          <input onChange={this.handleChange} name="hideSeedingTorrents" type="checkbox" defaultChecked={this.configStore.hideSeedingTorrents}/>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('hideFnishStatusItem')}</span>
          <input onChange={this.handleChange} name="hideFinishedTorrents" type="checkbox" defaultChecked={this.configStore.hideFinishedTorrents}/>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('showSpeedGraph')}</span>
          <input onChange={this.handleChange} name="showSpeedGraph" type="checkbox" defaultChecked={this.configStore.showSpeedGraph}/>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('popupHeight')}</span>
          <input onChange={this.handleSetInt} name="popupHeight" type="number" min="0" defaultValue={this.configStore.popupHeight}/>
          {' '}
          <span>{chrome.i18n.getMessage('px')}</span>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('popupUpdateInterval')}</span>
          <input onChange={this.handleSetInt} name="uiUpdateInterval" type="number" min="100" defaultValue={this.configStore.uiUpdateInterval}/>
          {' '}
          <span>{chrome.i18n.getMessage('ms')}</span>
        </label>
      </div>
    );
  }
}

@inject('rootStore')
@observer
class NotifyOptions extends OptionsPage {
  state = {
    colorPickerOpened: false
  };

  handleToggleColorPicker = (e) => {
    e.preventDefault();
    this.setState({
      colorPickerOpened: !this.state.colorPickerOpened
    });
  };

  handleChangeColor = (color) => {
    const rgba = [color.rgb.r, color.rgb.g, color.rgb.b, color.rgb.a].join(',');
    this.configStore.setOptions({
      badgeColor: rgba
    });
  };

  render() {
    const [r,g,b,a] = this.configStore.badgeColor.split(',');
    const sketchPickerColor = {
      r: parseInt(r, 10),
      g: parseInt(g, 10),
      b: parseInt(b, 10),
      a: parseFloat(a),
    };

    return (
      <div className="page notify">
        <h2>{chrome.i18n.getMessage('optNotify')}</h2>
        <label>
          <span>{chrome.i18n.getMessage('showNotificationOnDownloadCompleate')}</span>
          <input defaultChecked={this.configStore.showDownloadCompleteNotifications} onChange={this.handleChange} type="checkbox" name="showDownloadCompleteNotifications"/>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('displayActiveTorrentCountIcon')}</span>
          <input defaultChecked={this.configStore.showActiveCountBadge} onChange={this.handleChange} type="checkbox" name="showActiveCountBadge"/>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('badgeColor')}</span>
          <Popover
            isOpen={this.state.colorPickerOpened}
            onClickOutside={this.handleToggleColorPicker}
            position={'bottom'}
            content={(
              <SketchPicker color={sketchPickerColor} onChangeComplete={this.handleChangeColor}/>
            )}
          >
            <span onClick={this.handleToggleColorPicker} className="selectColor" style={{backgroundColor: `rgba(${this.configStore.badgeColor})`}}/>
          </Popover>
        </label>
        <label>
          <span>{chrome.i18n.getMessage('backgroundUpdateInterval')}</span>
          <input defaultValue={this.configStore.backgroundUpdateInterval} onChange={this.handleSetInt} type="number" name="backgroundUpdateInterval" min="1000"/>
          {' '}
          <span>{chrome.i18n.getMessage('ms')}</span>
        </label>
      </div>
    );
  }
}

@inject('rootStore')
@observer
class CtxOptions extends OptionsPage {
  render() {
    return (
      <div className="page ctx">
        <h2>{chrome.i18n.getMessage('optCtx')}</h2>
        <label>
          <span>{chrome.i18n.getMessage('selectDownloadCategoryOnAddItemFromContextMenu')}</span>
          <input onChange={this.handleChange} defaultChecked={this.configStore.selectDownloadCategoryAfterPutTorrentFromContextMenu} type="checkbox" name="selectDownloadCategoryAfterPutTorrentFromContextMenu"/>
        </label>
        <CtxOptionsDirs/>
      </div>
    );
  }
}

@inject('rootStore')
@observer
class CtxOptionsDirs extends OptionsPage {
  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const path = form.elements.path.value.trim();
    const name = form.elements.name.value.trim();
    if (!path) return;

    if (!this.configStore.hasFolder(path)) {
      this.configStore.addFolder(path, name);
      form.elements.path.value = '';
      form.elements.name.value = '';
    }
  };

  bodyRef = React.createRef();
  refDirectorySelect = React.createRef();

  get selectedDirectories() {
    return Array.from(this.refDirectorySelect.current.selectedOptions).map((option) => {
      return this.configStore.folders[parseInt(option.value, 10)];
    });
  }

  handleRemove = (e) => {
    e.preventDefault();
    this.configStore.removeFolders(this.selectedDirectories);
  };

  handleMoveUp = (e) => {
    e.preventDefault();
    this.configStore.moveFolders(this.selectedDirectories, -1);
  };

  handleMoveDown = (e) => {
    e.preventDefault();
    this.configStore.moveFolders(this.selectedDirectories, 1);
  };

  render() {
    const directories = this.configStore.folders.map((folder, index) => {
      let name = folder.path;
      if (folder.name) {
        name = `${folder.name} (${name})`;
      }
      return (
        <option key={JSON.stringify(folder)} value={index}>{name}</option>
      );
    });

    return (
      <>
        <h3>{chrome.i18n.getMessage('dirList')}</h3>
        <div ref={this.bodyRef}>
          <label>
            <span>{chrome.i18n.getMessage('treeViewContextMenu')}</span>
            <input onChange={this.handleChange} defaultChecked={this.configStore.treeViewContextMenu} type="checkbox" name="treeViewContextMenu"/>
          </label>
          <label>
            <span>{chrome.i18n.getMessage('showDefaultFolderContextMenuItem')}</span>
            <input onChange={this.handleChange} defaultChecked={this.configStore.putDefaultPathInContextMenu} type="checkbox" name="putDefaultPathInContextMenu"/>
          </label>
          <div className="optionItem">
            <form onSubmit={this.handleSubmit} autoComplete="off">
              <span>{chrome.i18n.getMessage('addItem')}</span>:
              <div className="optionItem">
                <span>{chrome.i18n.getMessage('subPath')}</span>
                {' '}
                <input name="path" type="text" required={true}/>
              </div>
              <div className="optionItem">
                <span>{chrome.i18n.getMessage('shortName')}</span>
                {' '}
                <input name="name" type="text"/>
                {' '}
                <button type="submit">{chrome.i18n.getMessage('add')}</button>
              </div>
            </form>
          </div>
          <div className="optionItem">
            <select ref={this.refDirectorySelect} id="folderList" multiple>
              {directories}
            </select>
          </div>
          <div className="optionItem">
            <button type="button" onClick={this.handleRemove}>{chrome.i18n.getMessage('deleteSelected')}</button>
            {' '}
            <button type="button" onClick={this.handleMoveUp}>{chrome.i18n.getMessage('up')}</button>
            {' '}
            <button type="button" onClick={this.handleMoveDown}>{chrome.i18n.getMessage('down')}</button>
          </div>
        </div>
      </>
    );
  }
}

class BackupOptions extends React.Component {
  state = {
    state: 'idle', // idle, pending, done, error
    saveState: 'idle', // idle, pending, done, error
    storage: null
  };

  componentDidMount() {
    this.handleUpdate();
  }

  handleUpdate = (e) => {
    e && e.preventDefault();

    this.setState({
      state: 'pending',
    });
    storageGet().then((storage) => {
      if (!this.refPage.current) return;
      this.setState({
        state: 'done',
        storage: JSON.stringify(storage)
      });
    }, (err) => {
      if (!this.refPage.current) return;
      this.setState({
        state: 'error',
        storage: ''
      });
    });
  };

  refPage = React.createRef();

  handleSaveInCloud = (e) => {
    e.preventDefault();

    this.setState({
      saveState: 'pending'
    });
    storageSet({
      backup: this.refData.current.value
    }, 'sync').then(() => {
      if (!this.refPage.current) return;
      this.setState({
        saveState: 'done'
      });
    }, (err) => {
      logger.error('handleSaveInCloud error', err);
      if (!this.refPage.current) return;
      this.setState({
        saveState: 'error'
      });
    });
  };

  refData = React.createRef();

  render() {
    let data = null;
    if (this.state.state === 'done') {
      data = (
        <textarea ref={this.refData} defaultValue={this.state.storage}/>
      );
    } else {
      data = (
        `Loading: ${this.state.state}`
      );
    }

    let saveToCloudDisabled = this.state.state !== 'done';
    let saveToCloudText = chrome.i18n.getMessage('optSaveInCloud');
    if (this.state.saveState === 'pending') {
      saveToCloudDisabled = true;
    } else
    if (this.state.saveState === 'error') {
      saveToCloudText = chrome.i18n.getMessage('OV_FL_ERROR');
    }

    return (
      <div ref={this.refPage} className="page backup">
        <h2>{chrome.i18n.getMessage('backup')}</h2>
        <form onSubmit={this.handleSaveInCloud}>
          <div className="btnList">
            <input onClick={this.handleUpdate} type="button" value={chrome.i18n.getMessage('update')}/>
            {' '}
            <input disabled={saveToCloudDisabled} value={saveToCloudText} type="submit"/>
          </div>
          {data}
        </form>
      </div>
    );
  }
}

class RestoreOptions extends React.Component {
  state = {
    cloudData: null,
    hasCloudData: false,
    data: ''
  };

  componentDidMount() {
    this.checkCloudData();
  }

  checkCloudData() {
    storageGet({
      backup: ''
    }, 'sync').then((storage) => {
      if (!this.refPage.current) return;
      this.setState({
        hasCloudData: !!storage.backup
      });
    }, (err) => {
      logger.error('checkCloudData error', err);
      if (!this.refPage.current) return;
      this.setState({
        hasCloudData: false
      });
    });
  };

  handleRestore = (e) => {
    e.preventDefault();
    Promise.resolve().then(() => {
      const config = Object.assign({configVersion: 1}, JSON.parse(this.refData.current.value));
      if (config.configVersion !== 2) {
        migrateConfig(config, config);
      }
      return storageSet(config);
    }).catch((err) => {
      logger.error('handleRestore error', err);
    });
  };

  handleGetBackup = (e) => {
    e.preventDefault();
    storageGet({
      backup: ''
    }, 'sync').then((storage) => {
      if (!this.refPage.current) return;
      this.refData.current.value = storage.backup;
    }, (err) => {
      logger.error('handleGetBackup error', err);
    });
  };

  handleClearCloud = (e) => {
    e.preventDefault();
    storageRemove(['backup'], 'sync').then(() => {
      this.setState({
        hasCloudData: false
      });
    }, (err) => {
      logger.error('handleClearCloud error', err);
    });
  };

  refPage = React.createRef();
  refData = React.createRef();

  render() {
    return (
      <div ref={this.refPage} className="page restore">
        <h2>{chrome.i18n.getMessage('restore')}</h2>
        <form onSubmit={this.handleRestore}>
          <div className="btnList">
            <input type="submit" value={chrome.i18n.getMessage('toRestore')}/>
            {' '}
            <input disabled={this.state.hasCloudData === false} onClick={this.handleGetBackup} type="button" value={chrome.i18n.getMessage('optGetFromCloud')}/>
            {' '}
            <input disabled={this.state.hasCloudData === false} onClick={this.handleClearCloud} type="button" value={chrome.i18n.getMessage('optClearCloudStorage')}/>
          </div>
          <textarea ref={this.refData} defaultValue={this.state.data} required={true}/>
        </form>
      </div>
    );
  }
}

class NotFound extends React.Component {
  render() {
    return (
      <Redirect to={"/"}/>
    );
  }
}

const rootStore = window.rootStore = RootStore.create();

ReactDOM.render(
  <Provider rootStore={rootStore}>
    <Options/>
  </Provider>,
  document.getElementById('root')
);