import React from "react";
import PropTypes from "prop-types";

const Interval = React.memo(({interval, onFire}) => {
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      onFire(false);
    }, interval);

    onFire(true);
    return () => {
      clearInterval(intervalId);
    };
  }, [interval]);
  return null;
});
Interval.propTypes = {
  interval: PropTypes.number.isRequired,
  onFire: PropTypes.func.isRequired,
};

export default Interval;