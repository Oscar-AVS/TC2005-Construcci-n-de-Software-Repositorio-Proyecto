/**
 * Weekly activity chart module.
 * Handles Chart.js initialization and updates.
 */

const ChartModule = (() => {
  let barChart = null;

  const byId = (id) => document.getElementById(id);

  const buildBarColors = (data) =>
    data.map((_, index) => (index === data.length - 1 ? '#f05a28' : '#f4c5b3'));

  const init = (weeklyData) => {
    const canvas = byId('activityChart');

    if (!canvas) {
      console.warn('ChartModule: Canvas #activityChart not found');
      return;
    }

    if (typeof Chart === 'undefined') {
      console.warn('ChartModule: Chart.js not loaded');
      return;
    }

    if (barChart) {
      barChart.destroy();
    }

    barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: weeklyData,
            backgroundColor: buildBarColors(weeklyData),
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#9ca3af',
              font: { family: 'DM Sans', size: 12 },
            },
          },
          y: {
            beginAtZero: true,
            max: 10,
            border: { display: false },
            ticks: {
              stepSize: 2,
              color: '#9ca3af',
              font: { family: 'DM Sans', size: 11 },
            },
            grid: { color: '#f1f2f4' },
          },
        },
      },
    });
  };

  const update = (weeklyData) => {
    if (!barChart) {
      return;
    }

    barChart.data.datasets[0].data = [...weeklyData];
    barChart.data.datasets[0].backgroundColor = buildBarColors(weeklyData);
    barChart.update();
  };

  return { init, update };
})();