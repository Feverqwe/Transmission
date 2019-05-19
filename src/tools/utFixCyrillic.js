const cirilic = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const chars = ("\\u037777777720\\u037777777620 \\u037777777720\\u037777777621 " +
  "\\u037777777720\\u037777777622 \\u037777777720\\u037777777623 " +
  "\\u037777777720\\u037777777624 \\u037777777720\\u037777777625 " +
  "\\u037777777720\\u037777777601 \\u037777777720\\u037777777626 " +
  "\\u037777777720\\u037777777627 \\u037777777720\\u037777777630 " +
  "\\u037777777720\\u037777777631 \\u037777777720\\u037777777632 " +
  "\\u037777777720\\u037777777633 \\u037777777720\\u037777777634 " +
  "\\u037777777720\\u037777777635 \\u037777777720\\u037777777636 " +
  "\\u037777777720\\u037777777637 \\u037777777720\\u037777777640 " +
  "\\u037777777720\\u037777777641 \\u037777777720\\u037777777642 " +
  "\\u037777777720\\u037777777643 \\u037777777720\\u037777777644 " +
  "\\u037777777720\\u037777777645 \\u037777777720\\u037777777646 " +
  "\\u037777777720\\u037777777647 \\u037777777720\\u037777777650 " +
  "\\u037777777720\\u037777777651 \\u037777777720\\u037777777652 " +
  "\\u037777777720\\u037777777653 \\u037777777720\\u037777777654 " +
  "\\u037777777720\\u037777777655 \\u037777777720\\u037777777656 " +
  "\\u037777777720\\u037777777657 \\u037777777720\\u037777777660 " +
  "\\u037777777720\\u037777777661 \\u037777777720\\u037777777662 " +
  "\\u037777777720\\u037777777663 \\u037777777720\\u037777777664 " +
  "\\u037777777720\\u037777777665 \\u037777777721\\u037777777621 " +
  "\\u037777777720\\u037777777666 \\u037777777720\\u037777777667 " +
  "\\u037777777720\\u037777777670 \\u037777777720\\u037777777671 " +
  "\\u037777777720\\u037777777672 \\u037777777720\\u037777777673 " +
  "\\u037777777720\\u037777777674 \\u037777777720\\u037777777675 " +
  "\\u037777777720\\u037777777676 \\u037777777720\\u037777777677 " +
  "\\u037777777721\\u037777777600 \\u037777777721\\u037777777601 " +
  "\\u037777777721\\u037777777602 \\u037777777721\\u037777777603 " +
  "\\u037777777721\\u037777777604 \\u037777777721\\u037777777605 " +
  "\\u037777777721\\u037777777606 \\u037777777721\\u037777777607 " +
  "\\u037777777721\\u037777777610 \\u037777777721\\u037777777611 " +
  "\\u037777777721\\u037777777612 \\u037777777721\\u037777777613 " +
  "\\u037777777721\\u037777777614 \\u037777777721\\u037777777615 " +
  "\\u037777777721\\u037777777616 \\u037777777721\\u037777777617").split(' ');

const utFixCyrillic = (data) => {
  if (data.indexOf("\\u03777777772") !== -1) {
    for (let i = 0, len = chars.length; i < len; i++) {
      const char_item = chars[i];
      while (data.indexOf(char_item) !== -1) {
        data = data.replace(char_item, cirilic[i]);
      }
    }
  }
  return data;
};

export default utFixCyrillic;