import React, { Component } from "react";
import styled from "styled-components";
import { Chart } from "react-charts";
import moment from "moment";

const Container = styled.div`
  position: relative;
  width: 100%;
  .chart {
    width: 100%;
    height: 150px;
    cursor: crosshair;
  }
  .filtering-label {
    font-size: 0.9em;
  }
  .info {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.8em;
    p {
      margin: 0;
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 7px;
    }
  }
`;

export default function PeopleHistoryChart(props) {
  const [{ min, max, focused }, setState] = React.useState({
    min: props.min || null,
    max: props.max || null,
    focused: false
  });
  const parseHistory = () => {
    let data = [];
    for (const date in props.data.history) {
      data.push([moment(date).toDate(), props.data.history[date]]);
    }
    return data;
  };
  const series = React.useMemo(
    () => ({
      type: "area"
    }),
    []
  );
  const data = React.useMemo(() => [
    {
      data: parseHistory()
    }
  ]);
  const axes = React.useMemo(
    () => [
      {
        primary: true,
        type: "time",
        position: "bottom",
        hardMin: min,
        hardMax: max,
        showGrid: false,
        showTicks: false
      },
      {
        type: "linear",
        position: "left",
        stacked: true,
        showGrid: false,
        showTicks: false
      }
    ],
    [max, min]
  );
  const brush = React.useMemo(
    () => ({
      onSelect: brushData => {
        const min = Math.min(brushData.start, brushData.end);
        const max = Math.max(brushData.start, brushData.end);
        setState({ min, max });
        props.onChange && props.onChange({ min, max });
      }
    }),
    []
  );
  const clearBrush = () => {
    let min,
      max = null;
    setState({ min, max });
    props.onChange && props.onChange({ min, max });
  };
  const handleFocused = pointer => {
    if (pointer) {
      setState({
        min,
        max,
        focused: { date: pointer.xValue, amount: pointer.yValue }
      });
    }
  };
  return (
    <Container>
      {max || min ? (
        <p className="filtering-label">
          Visualizando pessoas que interagiram pela primeira vez entre{" "}
          <strong>
            {moment(min).format("DD/MM")} - {moment(max).format("DD/MM")}
          </strong>
          .{" "}
          <a href="javacript:void(0);" onClick={clearBrush}>
            Limpar seleção
          </a>
        </p>
      ) : (
        <p>
          Recém-chegados na sua página.{" "}
          <span className="tip">Selecione o gráfico para filtrar:</span>
        </p>
      )}
      <div className="chart">
        <Chart
          data={data}
          series={series}
          axes={axes}
          brush={brush}
          onFocus={handleFocused}
        />
      </div>
      {focused ? (
        <div className="info">
          <p>
            <strong>{moment(focused.date).format("DD/MM")}</strong>{" "}
            {focused.amount} novas pessoas
          </p>
        </div>
      ) : null}
    </Container>
  );
}
