const charts = {
  type: 'line',
  data: {
    labels: ['0', 'a', 'b', '∞'],
    datasets: [{
      label: 'probability',
      data: [0, 0, 1, 1],
      fill: false,
    }],
  },
  options: {
    scales: {
      yAxes: [{
        ticks: {
          stepSize: 0.5,
        },
      }],
    },
  },
}

export const usage = `
连续同声调的触发概率遵循以下函数：

invlerp<sub>a,b</sub>(t) = clamp(0, 1, <span class="fraction">
  <span class="numerator">t - a</span>
  <span class="denominator">b - a</span>
</span>)

![invlerp(a,b)](https://quickchart.io/chart?w=180&h=120&c=${JSON.stringify(charts)})

<style>
  .fraction {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    vertical-align: middle;
  }
  .fraction .numerator {
    border-bottom: 1.5px solid #000;
    padding: 0 6px 2px;
  }
  .fraction .denominator {
    padding: 0 6px;
  }
</style>
`
