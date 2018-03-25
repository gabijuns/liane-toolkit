import React from "react";
import * as d3_core from "d3";
import * as d3_geo from "d3-geo";
import topojson from "topojson";
const d3 = {
  ...d3_core,
  ...d3_geo
};

export default class AudienceMap extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this._buildMap = this._buildMap.bind(this);
  }
  _geojson() {
    const { summary, geolocationId } = this.props;
    let geojson = {
      type: "FeatureCollection",
      features: []
    };
    if (summary.mainGeolocation && summary.mainGeolocation.geojson) {
      let active = false;
      if (summary.mainGeolocation._id == geolocationId) {
        active = true;
      }
      geojson.features.push({
        ...summary.mainGeolocation.geojson,
        properties: {
          _id: summary.mainGeolocation._id,
          main: true,
          active
        }
      });
    }
    summary.data.forEach(item => {
      let active = false;
      if (item.geolocation._id == geolocationId) {
        active = true;
      }
      if (item.geolocation.geojson) {
        geojson.features.push({
          ...item.geolocation.geojson,
          properties: {
            _id: item.geolocation._id,
            ...item.audience,
            active
          }
        });
      } else if (item.geolocation.center) {
        geojson.features.push({
          type: "Feature",
          properties: {
            _id: item.geolocation._id,
            ...item.audience,
            radius: item.geolocation.center.radius,
            active
          },
          geometry: {
            type: "Point",
            coordinates: [
              item.geolocation.center.center[1],
              item.geolocation.center.center[0]
            ]
          }
        });
      }
    });
    return geojson;
  }
  componentDidMount() {
    this.setState({
      ready: true
    });
    this._buildMap();
  }
  componentDidUpdate() {
    this._buildMap();
  }
  _buildMap() {
    if (!this.refs.map) return;
    const { summary } = this.props;
    let svg = this.refs.map;
    if (summary && svg) {
      svg = d3.select(svg);

      const width = 600;
      const height = 600;

      const geojson = this._geojson();

      // const center = d3.geoCentroid(geojson.features[0].geometry);

      const projection = d3.geoMercator();
      const path = d3.geoPath(projection);

      const topology = topojson.topology({ audience: geojson });

      console.log(topology);

      const centroids = geojson.features.map(d3.geoCentroid);

      projection.fitSize(
        [width, height],
        topojson.feature(topology, topology.objects.audience)
      );

      // projection.fitExtent([[0, 0], [0, 0]], topology.bbox);

      svg
        .selectAll("path")
        .data(topojson.feature(topology, topology.objects.audience).features)
        .enter()
        .append("path")
        .attr("fill-opacity", 0)
        .attr("stroke", "#000000")
        .attr("d", path);
    }
  }
  render() {
    const { loading, summary } = this.props;
    if (loading && !summary) {
      return null;
    } else if (summary) {
      return <svg ref="map" width={600} height={600} />;
    } else {
      return null;
    }
  }
}
