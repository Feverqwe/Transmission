import React from "react";
import PropTypes from "prop-types";

const Interval = React.memo(({interval, onFire, onInit}) => {
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      onFire();
    }, interval);

    onInit && onInit();
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  return null;
});
Interval.propTypes = {
  interval: PropTypes.number.isRequired,
  onFire: PropTypes.func.isRequired,
  onInit: PropTypes.func,
};

export default Interval;