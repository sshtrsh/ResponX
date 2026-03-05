import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { Report } from "../types/report";

/**
 * Export an array of reports as a CSV file download.
 */
export function exportToCsv(reports: Report[], filename: string) {
    const headers = [
        "ID", "Incident Type", "Location", "Status", "Description",
        "Reporter", "Priority", "Latitude", "Longitude", "Created At",
    ];

    const escape = (val: string | undefined | null) => {
        if (val == null) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
    };

    const rows = reports.map((r) => [
        r.id, r.incident_type, r.location, r.status, r.description,
        r.reporter_name ?? "", r.priority ?? "", r.latitude ?? "", r.longitude ?? "",
        r.created_at,
    ].map((v) => escape(String(v))).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Captures a DOM element as a high-resolution canvas,
 * then creates a multi-page PDF with proper margins.
 */
export async function exportToPdf(
    element: HTMLElement,
    filename: string,
) {
    const canvas = await html2canvas(element, {
        scale: 2,                    // 2x resolution for crisp text
        useCORS: true,               // Allow cross-origin images (Leaflet tiles)
        backgroundColor: "#f8fafc",  // match bg-slate-50
        logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 landscape for dashboard-style content
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    // Scale image to fit page width
    const ratio = usableWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    // If content fits on one page, just add it
    if (scaledHeight <= usableHeight) {
        pdf.addImage(imgData, "PNG", margin, margin, usableWidth, scaledHeight);
    } else {
        // Multi-page: slice the image vertically
        let yOffset = 0;
        const sliceHeight = usableHeight / ratio; // height in image-px per page

        while (yOffset < imgHeight) {
            const remainingHeight = imgHeight - yOffset;
            const thisSliceHeight = Math.min(sliceHeight, remainingHeight);
            const thisScaledHeight = thisSliceHeight * ratio;

            // Create a temporary canvas for this slice
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = imgWidth;
            sliceCanvas.height = thisSliceHeight;
            const ctx = sliceCanvas.getContext("2d")!;
            ctx.drawImage(
                canvas,
                0, yOffset,               // source x, y
                imgWidth, thisSliceHeight, // source w, h
                0, 0,                      // dest x, y
                imgWidth, thisSliceHeight, // dest w, h
            );

            const sliceData = sliceCanvas.toDataURL("image/png");
            if (yOffset > 0) pdf.addPage();
            pdf.addImage(sliceData, "PNG", margin, margin, usableWidth, thisScaledHeight);

            yOffset += thisSliceHeight;
        }
    }

    pdf.save(filename);
}

/**
 * Captures a DOM element as a high-resolution PNG download.
 */
export async function exportToPng(
    element: HTMLElement,
    filename: string,
) {
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc",
        logging: false,
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
}
