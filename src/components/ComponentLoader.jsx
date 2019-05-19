import React from "react";
import PropTypes from "prop-types";

const Graph = React.lazy(() => import('./Graph'));

const idComponent = {
  graph: Graph,
};

class ComponentLoader extends React.Component {
  static propTypes = {
    'load-page': PropTypes.string.isRequired,
  };

  render() {
    if (window.PRERENDER) {
      return (
        <Spinner/>
      );
    }

    const {'load-page': componentId} = this.props;

    const Component = idComponent[componentId];

    return (
      <React.Suspense fallback={<Spinner/>}>
        <Component/>
      </React.Suspense>
    );
  }
}

const Spinner = () => null;

export default ComponentLoader;