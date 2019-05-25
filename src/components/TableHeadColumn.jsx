import React from "react";
import PropTypes from "prop-types";

class TableHeadColumn extends React.Component {
  static propTypes = {
    column: PropTypes.object.isRequired,
    isSorted: PropTypes.bool.isRequired,
    sortDirection: PropTypes.number.isRequired,
    onMoveColumn: PropTypes.func.isRequired,
    onSort: PropTypes.func.isRequired,
    onSaveColumns: PropTypes.func.isRequired,
    withStyle: PropTypes.bool,
  };

  type = null;

  handleDragStart = (e) => {
    const {column} = this.props;

    e.dataTransfer.setData('name', column.column);
    e.dataTransfer.setData('type', this.type);
  };

  handleDragOver = (e) => {
    const el = e.target;
    if (el.tagName !== 'TH' && el.parentNode.tagName !== 'TH') return;
    e.preventDefault();
    e.stopPropagation();
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let el = e.target;
    if (el.tagName !== 'TH') {
      el = el.parentNode;
    }
    if (el.tagName !== 'TH') {
      return;
    }

    const {column} = this.props;

    if (this.type !== e.dataTransfer.getData('type')) {
      return;
    }
    const toName = column.column;
    const fromName = e.dataTransfer.getData('name');
    if (toName === fromName) return;

    this.props.onMoveColumn(fromName, toName)
  };

  handleResizeClick = (e) => {
    e.stopPropagation();
  };

  handleBodyMouseMove = (e) => {
    const delta = e.clientX - this.resizeStartClientX;
    let newSize = this.resizeStartSize + delta;
    if (newSize < 16) {
      newSize = 16;
    }
    this.props.column.setWidth(newSize);
  };

  handleBodyMouseUp = (e) => {
    e.stopPropagation();

    document.body.removeEventListener('mousemove', this.handleBodyMouseMove);
    document.body.removeEventListener('mouseup', this.handleBodyMouseUp);

    this.refTh.current.draggable = true;

    this.props.onSaveColumns();
  };

  resizeStartSize = null;
  resizeStartClientX = null;

  handleResizeMouseDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    this.refTh.current.draggable = false;

    this.resizeStartSize = this.refTh.current.clientWidth + 1; // + 1 - border right
    this.resizeStartClientX = e.clientX;

    document.body.addEventListener('mousemove', this.handleBodyMouseMove);
    document.body.addEventListener('mouseup', this.handleBodyMouseUp);
  };

  refTh = React.createRef();

  handleSort = (e) => {
    e.preventDefault();
    let direction = 1;
    if (this.props.isSorted) {
      direction =  this.props.sortDirection === 1 ? 0 : 1;
    }
    this.props.onSort(this.props.column.column, direction);
  };
}

export default TableHeadColumn;