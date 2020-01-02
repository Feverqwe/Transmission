import {observer} from "mobx-react";
import {autorun} from "mobx";
import React from "react";
import {curveBasis, easeQuadOut, line, scaleLinear, select, transition} from "d3";
import RootStoreCtx from "../tools/RootStoreCtx";

@observer
class Graph extends React.Component {
  static contextType = RootStoreCtx;

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  graphAutorun = null;
  componentDidMount() {
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

    const uploadLine = line().x(d => x(d.time)).y(d => y(d.upload)).curve(curveBasis);
    const downloadLine = line().x(d => x(d.time)).y(d => y(d.download)).curve(curveBasis);

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

      const t = transition().duration(500).ease(easeQuadOut);
      downloadLinePath.datum(data).transition(t).attr('d', downloadLine);
      uploadLinePath.datum(data).transition(t).attr('d', uploadLine);
    });

    this.refChart.current.appendChild(svg.node());
  }

  componentWillUnmount() {
    this.graphAutorun();
    this.graphAutorun = null;
  }

  refChart = React.createRef();

  render() {
    return (
      <div ref={this.refChart}/>
    );
  }
}

export default Graph;