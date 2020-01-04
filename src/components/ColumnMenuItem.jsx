import {observer} from "mobx-react";
import React from "react";
import PropTypes from "prop-types";
import {Item} from "react-contexify";

@observer
class ColumnMenuItem extends React.PureComponent {
  static propTypes = {
    column: PropTypes.object.isRequired,
    onToggleColumn: PropTypes.func.isRequired,
  };

  /**@returns {ColumnStore}*/
  get columnStore() {
    return this.props.column;
  }

  handleClick = ({event, props}) => {
    this.props.onToggleColumn({event, props, column: this.columnStore});
  };

  render() {
    let selected = null;
    if (this.columnStore.display) {
      selected = (
        <label>●</label>
      )
    }

    return (
      <Item onClick={this.handleClick}>{selected}{chrome.i18n.getMessage(this.columnStore.lang)}</Item>
    );
  }
}

export default ColumnMenuItem;