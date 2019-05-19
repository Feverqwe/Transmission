import {inject, observer} from "mobx-react";
import {autorun} from "mobx";
import React from "react";
import PropTypes from "prop-types";
import {easeQuadOut, line, scaleLinear, select, transition} from "d3";

@inject('rootStore')
@observer
class Graph extends React.Component {
  static propTypes = {
    rootStore: PropTypes.object,
  };

  state = {
    isBlur: false
  };

  /**@return {RootStore}*/
  get rootStore() {
    return this.props.rootStore;
  }

  graphAutorun = null;
  componentDidMount() {
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);

    const ctr = this.refChart.current;
    const speedRoll = this.rootStore.client.speedRoll;

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svg = select(svgEl);

    const uploadLinePath = svg.append("path").attr("fill", "none")
      .attr("stroke", "#41B541")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");
    const downloadLinePath = svg.append("path").attr("fill", "none")
      .attr("stroke", "#3687ED")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    const x = scaleLinear();
    const y = scaleLinear();

    const uploadLine = line().x(d => x(d.time)).y(d => y(d.upload));
    const downloadLine = line().x(d => x(d.time)).y(d => y(d.download));

    let width = null;
    const height = 30;
    let minTime = speedRoll.minTime;
    this.graphAutorun = autorun(() => {
      if (!this.refChart.current) return;

      if (ctr.clientWidth !== width) {
        width = ctr.clientWidth;
        svgEl.setAttribute('width', width);
        svgEl.setAttribute('height', height);
        svgEl.setAttribute('viewBox', `0,0,${width},${height}`);
        y.range([height, 0]);
        x.range([0, width]);
      }

      y.domain([speedRoll.minSpeed, speedRoll.maxSpeed || 1]);
      x.domain([speedRoll.minTime, speedRoll.maxTime]);

      if (minTime < Date.now() - 5 * 60 * 1000) {
        minTime = speedRoll.minTime;
      }

      const data = speedRoll.getDataFromTime(minTime);

      if (this.state.isBlur) {
        downloadLinePath.datum(data).attr('d', downloadLine);
        uploadLinePath.datum(data).attr('d', uploadLine);
      } else {
        const t = transition().duration(500).ease(easeQuadOut);
        downloadLinePath.datum(data).transition(t).attr('d', downloadLine);
        uploadLinePath.datum(data).transition(t).attr('d', uploadLine);
      }
    });

    this.refChart.current.appendChild(svg.node());
  }

  componentWillUnmount() {
    this.graphAutorun();
    this.graphAutorun = null;
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
  }

  handleFocus = () => {
    this.state.isBlur = false;
  };

  handleBlur = () => {
    this.state.isBlur = true;
  };

  refChart = React.createRef();

  render() {
    return (
      <div ref={this.refChart}/>
    );
  }
}

export default Graph;