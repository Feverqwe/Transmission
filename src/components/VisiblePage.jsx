import React from "react";

class VisiblePage extends React.PureComponent {
  state = {
    isHidden: document.hidden
  };

  componentDidMount() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  componentWillUnmount() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  handleVisibilityChange = () => {
    this.setState({
      isHidden: document.hidden
    });
  };

  render() {
    if (this.state.isHidden) return null;

    return (
      this.props.children
    );
  }
}

export default VisiblePage;