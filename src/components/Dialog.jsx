import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from "prop-types";

class Dialog extends React.PureComponent {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    className: PropTypes.string,
  };

  componentDidMount() {
    document.addEventListener('click', this.handleBodyClick);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleBodyClick);
  }

  handleBodyClick = (e) => {
    if (!this.refDialog.current.contains(e.target)) {
      this.props.onClose();
    }
  };

  refDialog = React.createRef();

  render() {
    const classList = ['dialog__body'];
    if (this.props.className) {
      classList.push(this.props.className);
    }

    const {onClose, ...props} = this.props;

    const dialog = (
      <div {...props} ref={this.refDialog} className={classList.join(' ')}>
        {this.props.children}
      </div>
    );

    return ReactDOM.createPortal(dialog, document.body);
  }
}

export default Dialog;