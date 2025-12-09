function drawGenrePieChart(stats) {
    if (typeof genre_stats !== 'undefined' && genre_stats.length > 0) {
        if (!stats || stats.length === 0) {
        console.log("No genre data to draw chart.");
        return;
    }
        // 1. Prepare Data for Chart.js
        const labels = [];
        const counts = [];

        // Filter out potential empty/null genres and limit to the top 10 for clarity
        const filteredStats = genre_stats
            .filter(g => g.SingleGenre && g.SingleGenre.trim() !== '' && g.GenreCount > 0)
            // You might want to sort these server-side, but we can do it here too
            .sort((a, b) => b.GenreCount - a.GenreCount)
            .slice(0, 10);

        for (const stat of filteredStats) {
            labels.push(stat.SingleGenre);
            counts.push(stat.GenreCount);
        }

        // 2. Initialize and Draw the Chart
        const ctx = document.getElementById('genrePieChart').getContext('2d');

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Track Count',
                    data: counts,
                    // Chart.js automatically generates distinct colors, 
                    // but you can define a color array here if needed
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#E44C4C', '#A8D8B9', '#6C5B7B', '#C06C84'
                    ],
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'white' // Customize legend text color
                        }
                    },
                    title: {
                        display: true,
                        text: 'Genres',
                        color: 'white',
                        position: 'top',
                        align: 'start'
                    }

                }
            }
        });
    }
}