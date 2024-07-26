let chart;

function initChart() {
    const ctx = document.getElementById("myChart").getContext("2d");
    chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                label: "Income vs Expenses",
                backgroundColor: ["#28a745", "#dc3545"],
                data: [0, 0]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function updateChart(income, outcome) {
    chart.data.datasets[0].data[0] = income;
    chart.data.datasets[0].data[1] = outcome;
    chart.update();
}

document.addEventListener("DOMContentLoaded", function() {
    initChart();
});
