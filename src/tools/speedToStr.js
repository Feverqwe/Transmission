import formatSpeed from "./formatSpeed";

function speedToStr(speed) {
  let speedText = null;
  if (!Number.isFinite(speed)) {
    speedText = '';
  } else {
    speedText = formatSpeed(speed);
  }
  return speedText;
}

export default speedToStr;