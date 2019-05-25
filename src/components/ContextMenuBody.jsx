import React from "react";
import PropTypes from "prop-types";

class ContextMenuBody extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
    propsFromTrigger: PropTypes.object.isRequired,
  };

  state = {
    source: null,
    onHide: null,
    self: this
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const propsFromTrigger = nextProps.propsFromTrigger;

    if (prevState.source !== propsFromTrigger.source) {
      prevState.self.state.source = propsFromTrigger.source;

      if (prevState.onHide) {
        prevState.onHide();
      }

      prevState.self.state.onHide = propsFromTrigger.onHide;
      return {};
    }

    return null;
  }

  componentWillUnmount() {
    this.state.source = null;
    this.state.self = null;

    if (this.state.onHide) {
      this.state.onHide();
      this.state.onHide = null;
    }
  }
}

export default ContextMenuBody;