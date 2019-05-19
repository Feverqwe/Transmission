import React from "react";
import PropTypes from "prop-types";

class Interval extends React.PureComponent {
  static propTypes = {
    interval: PropTypes.number.isRequired,
    onFire: PropTypes.func.isRequired,
    onInit: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.intervalId = setInterval(() => {
      props.onFire();
    }, this.props.interval);

    props.onInit && props.onInit();
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  render() {
    return null;
  }
}

export default Interval;