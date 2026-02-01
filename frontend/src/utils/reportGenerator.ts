import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface DashboardStats {
    totalSequences: number;
    recentSequences: number;
    totalCountries: number;
    lastUpdated: string | null;
}

interface ReportData {
    stats: DashboardStats;
    forecasts: Array<{
        forecast_date: string;
        risk_score: number;
        confidence_lower: number;
        confidence_upper: number;
    }> | undefined;
}

export const generatePDFReport = (data: ReportData) => {
    const doc = new jsPDF();
    const today = format(new Date(), 'yyyy-MM-dd HH:mm');

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("FluSight-Asia Intelligence Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${today}`, 14, 28);
    doc.text(`Region: Asia (H3N2 Focus)`, 14, 33);
    if (data.stats.lastUpdated) {
        doc.text(`Last Pipeline Update: ${format(new Date(data.stats.lastUpdated), 'yyyy-MM-dd HH:mm')}`, 14, 38);
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, 196, 42);

    // 1. Executive Summary / Key Metrics
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Key Epidemiological Metrics", 14, 52);

    const statsData = [
        ['Total Sequences Analyzed', data.stats.totalSequences.toLocaleString()],
        ['Recent Sequences (30 days)', data.stats.recentSequences.toLocaleString()],
        ['Active Surveillance Countries', data.stats.totalCountries.toString()]
    ];

    autoTable(doc, {
        startY: 57,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 255] }, // Violet-ish
        styles: { fontSize: 11 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // 2. Risk Evaluation & Forecast
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 100;

    doc.setFontSize(14);
    doc.text("2. Predictive Risk Forecast (Next 3 Months)", 14, finalY + 15);

    if (data.forecasts && data.forecasts.length > 0) {
        const forecastRows = data.forecasts.map(f => [
            format(new Date(f.forecast_date), 'MMMM yyyy'),
            f.risk_score.toFixed(3),
            `${f.confidence_lower.toFixed(2)} - ${f.confidence_upper.toFixed(2)}`,
            f.risk_score > 0.5 ? 'HIGH' : (f.risk_score > 0.2 ? 'MEDIUM' : 'LOW')
        ]);

        autoTable(doc, {
            startY: finalY + 20,
            head: [['Month', 'Risk Score', 'Confidence Interval', 'Risk Level']],
            body: forecastRows,
            theme: 'grid',
            headStyles: { fillColor: [225, 29, 72] }, // Rose-500
            styles: { fontSize: 10 }
        });
    } else {
        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.text("No forecast data available at this time.", 14, finalY + 25);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - Private & Confidential - FluSight-Asia System`, 105, 290, { align: 'center' });
    }

    // Save
    doc.save(`flusight_report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
};
