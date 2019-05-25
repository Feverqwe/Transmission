const timeAgoList = JSON.parse(chrome.i18n.getMessage('timeOutList'));

const getEta = (eta) => {
  let result = '∞';
  if (eta !== -1) {
    let day = Math.floor(eta / 60 / 60 / 24);
    const week = Math.floor(day / 7);
    const hour = Math.floor((eta - day * 60 * 60 * 24) / 60 / 60);
    const minutes = Math.floor((eta - day * 60 * 60 * 24 - hour * 60 * 60) / 60);
    const seconds = Math.floor((eta - day * 60 * 60 * 24 - hour * 60 * 60 - minutes * 60));
    day = Math.floor(eta / 60 / 60 / 24 - 7 * week);
    if (week > 10) {
      // pass
    } else
    if (week > 0) {
      result = week + timeAgoList[0] + ' ' + day + timeAgoList[1];
    } else
    if (day > 0) {
      result = day + timeAgoList[1] + ' ' + hour + timeAgoList[2];
    } else
    if (hour > 0) {
      result = hour + timeAgoList[2] + ' ' + minutes + timeAgoList[3];
    } else
    if (minutes > 0) {
      result = minutes + timeAgoList[3] + ' ' + seconds + timeAgoList[4];
    } else
    if (seconds > 0) {
      result = seconds + timeAgoList[4];
    }
  }
  return result;
};

export default getEta;