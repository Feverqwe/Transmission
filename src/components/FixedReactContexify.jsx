import {Menu as _Menu} from "react-contexify";
import isFirefox from "../tools/isFirefox";

class FixedMenu extends _Menu {
  constructor(props) {
    super(props);
    if (isFirefox()) {
      const prevBindWindowEvent = this.bindWindowEvent;
      this.bindWindowEvent = () => {
        prevBindWindowEvent();
        window.removeEventListener('resize', this.hide);
      };
    }
  }
}

export {FixedMenu};